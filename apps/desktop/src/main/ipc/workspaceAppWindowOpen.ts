import {
  resolveBrowserNavigationUrl,
  type BrowserNodeOpenUrlEvent
} from "@tutti-os/browser-node";
import { desktopIpcChannels } from "../../shared/contracts/ipc.ts";

interface WorkspaceAppWindowOpenContents {
  id: number;
  setWindowOpenHandler?(
    handler: (details: WorkspaceAppWindowOpenDetails) => {
      action: "allow" | "deny";
    }
  ): void;
}

interface WorkspaceAppWindowOpenDetails {
  referrer?: {
    url?: string | null;
  } | null;
  url: string;
}

interface WorkspaceAppWindowOpenOwnerWindow {
  isDestroyed?(): boolean;
  webContents: {
    isDestroyed?(): boolean;
    send(channel: string, payload: BrowserNodeOpenUrlEvent): void;
  };
}

interface WorkspaceAppWindowOpenLogger {
  info?(message: string, details?: Record<string, unknown>): void;
  warn?(message: string, details?: Record<string, unknown>): void;
}

interface WorkspaceAppWindowOpenHandlerInput {
  appBaseUrl?: string | null;
  contents: WorkspaceAppWindowOpenContents;
  logger?: WorkspaceAppWindowOpenLogger;
  ownerWindow: WorkspaceAppWindowOpenOwnerWindow;
}

interface WorkspaceAppOpenUrlInput extends WorkspaceAppWindowOpenHandlerInput {
  url: string;
}

export function installWorkspaceAppWindowOpenHandler({
  appBaseUrl,
  contents,
  logger,
  ownerWindow
}: WorkspaceAppWindowOpenHandlerInput): void {
  const hasSetWindowOpenHandler =
    typeof contents.setWindowOpenHandler === "function";
  if (!hasSetWindowOpenHandler) {
    logger?.warn?.("workspace app guest window-open handler unavailable", {
      webContentsId: contents.id
    });
    return;
  }

  contents.setWindowOpenHandler?.((details) => {
    const { url } = details;
    if (
      isInternalWorkspaceAppWindowOpenUrl({
        appBaseUrl,
        referrerUrl: details.referrer?.url,
        url
      })
    ) {
      logger?.info?.("workspace app native internal window-open suppressed", {
        referrerUrl: details.referrer?.url ?? null,
        url,
        webContentsId: contents.id
      });
      return { action: "deny" };
    }
    dispatchWorkspaceAppOpenUrl({ contents, logger, ownerWindow, url });
    return { action: "deny" };
  });
}

export function dispatchWorkspaceAppOpenUrl({
  contents,
  logger,
  ownerWindow,
  url
}: WorkspaceAppOpenUrlInput): boolean {
  const resolved = resolveBrowserNavigationUrl(url);
  if (!resolved.url) {
    logger?.warn?.("workspace app guest ignored unsupported open-url", {
      url,
      webContentsId: contents.id
    });
    return false;
  }

  if (
    ownerWindow.isDestroyed?.() === true ||
    ownerWindow.webContents.isDestroyed?.() === true
  ) {
    logger?.warn?.("workspace app guest open-url owner window unavailable", {
      ownerWindowDestroyed: ownerWindow.isDestroyed?.() === true,
      ownerWebContentsDestroyed:
        ownerWindow.webContents.isDestroyed?.() === true,
      url: resolved.url,
      webContentsId: contents.id
    });
    return false;
  }

  const payload: BrowserNodeOpenUrlEvent = {
    reuseIfOpen: false,
    sourceNodeId: `workspace-app:${contents.id}`,
    type: "open-url",
    url: resolved.url
  };
  logger?.info?.("workspace app emitted open-url", {
    sourceNodeId: payload.sourceNodeId,
    url: payload.url,
    webContentsId: contents.id
  });
  ownerWindow.webContents.send(desktopIpcChannels.browser.event, payload);
  return true;
}

function isInternalWorkspaceAppWindowOpenUrl({
  appBaseUrl,
  referrerUrl,
  url
}: {
  appBaseUrl?: string | null;
  referrerUrl?: string | null;
  url: string;
}): boolean {
  if (isRelativeWorkspaceAppWindowOpenUrl(url)) {
    return true;
  }

  return isSameOriginUrl(url, appBaseUrl) || isSameOriginUrl(url, referrerUrl);
}

function isSameOriginUrl(
  url: string,
  baseUrl: string | null | undefined
): boolean {
  if (!baseUrl) {
    return false;
  }
  try {
    return new URL(url, baseUrl).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

function isRelativeWorkspaceAppWindowOpenUrl(url: string): boolean {
  const value = url.trim();
  if (value.length === 0 || value.startsWith("//")) {
    return false;
  }

  return !/^[A-Za-z][A-Za-z\d+.-]*:/.test(value);
}

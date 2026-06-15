import { resolveWorkspaceFileDefaultApplicationIconExtension } from "@tutti-os/workspace-file-manager/services";
import {
  readApplicationIconDataUrl,
  resolveDefaultApplicationForFile
} from "./openWithApplications.ts";
import type { WorkspaceFileIconCacheStore } from "./workspaceFileIconCacheStore.ts";

const entryIconPixelSize = 64;

export interface WorkspaceFileEntryIconInput {
  kind: string;
  mtimeMs: number | null;
  name: string;
  path: string;
  workspaceID: string;
}

interface WorkspaceFileEntryIconResolverDependencies {
  readApplicationIconDataUrl?: typeof readApplicationIconDataUrl;
  readNativeFileIconPngBytes?: typeof readNativeFileIconPngBytes;
  resolveDefaultApplicationForFile?: typeof resolveDefaultApplicationForFile;
}

export async function resolveWorkspaceFileEntryIconUrl(
  targetPath: string,
  entry: WorkspaceFileEntryIconInput,
  cacheStore: WorkspaceFileIconCacheStore,
  dependencies: WorkspaceFileEntryIconResolverDependencies = {}
): Promise<string | null> {
  if (isApplicationBundleEntry(entry)) {
    return resolveApplicationBundleIconUrl(
      targetPath,
      entry,
      cacheStore,
      dependencies
    );
  }

  return resolveFileTypeDefaultApplicationIconUrl(
    targetPath,
    entry,
    cacheStore,
    dependencies
  );
}

async function resolveApplicationBundleIconUrl(
  targetPath: string,
  entry: WorkspaceFileEntryIconInput,
  cacheStore: WorkspaceFileIconCacheStore,
  dependencies: WorkspaceFileEntryIconResolverDependencies
): Promise<string | null> {
  const cacheKey = {
    assetKind: "application-icon" as const,
    mtimeMs: entry.mtimeMs,
    path: entry.path,
    workspaceID: entry.workspaceID
  };
  const cachedUrl = await cacheStore.readUrl(cacheKey);
  if (cachedUrl) {
    return cachedUrl;
  }

  const nativeIcon = await (
    dependencies.readNativeFileIconPngBytes ?? readNativeFileIconPngBytes
  )(targetPath);
  const iconBytes =
    nativeIcon ??
    dataUrlToPngBytes(
      await (
        dependencies.readApplicationIconDataUrl ?? readApplicationIconDataUrl
      )(targetPath, entry.name)
    );
  if (!iconBytes) {
    return null;
  }

  return cacheStore.write({
    bytes: iconBytes,
    key: cacheKey,
    mimeType: "image/png"
  });
}

async function resolveFileTypeDefaultApplicationIconUrl(
  targetPath: string,
  entry: WorkspaceFileEntryIconInput,
  cacheStore: WorkspaceFileIconCacheStore,
  dependencies: WorkspaceFileEntryIconResolverDependencies
): Promise<string | null> {
  const fileExtension =
    resolveWorkspaceFileDefaultApplicationIconExtension(entry);
  if (!fileExtension) {
    return null;
  }

  const defaultApplication = await (
    dependencies.resolveDefaultApplicationForFile ??
    resolveDefaultApplicationForFile
  )(targetPath);
  if (!defaultApplication) {
    return null;
  }

  const cacheKey = {
    applicationPath: defaultApplication.applicationPath,
    assetKind: "file-type-default-application-icon" as const,
    fileExtension,
    platform: "darwin" as const
  };
  const cachedUrl = await cacheStore.readUrl(cacheKey);
  if (cachedUrl) {
    return cachedUrl;
  }

  const iconBytes = dataUrlToPngBytes(
    await (
      dependencies.readApplicationIconDataUrl ?? readApplicationIconDataUrl
    )(defaultApplication.applicationPath, defaultApplication.name)
  );
  if (!iconBytes) {
    return null;
  }

  return cacheStore.write({
    bytes: iconBytes,
    key: cacheKey,
    mimeType: "image/png"
  });
}

function isApplicationBundleEntry(
  entry: Pick<WorkspaceFileEntryIconInput, "kind" | "name">
): boolean {
  return entry.kind !== "file" && isApplicationBundleName(entry.name);
}

export function isApplicationBundleName(name: string): boolean {
  return name.trim().toLowerCase().endsWith(".app");
}

export function isMacOSApplicationBundle(
  entry: Pick<WorkspaceFileEntryIconInput, "kind" | "name">,
  platform: NodeJS.Platform = process.platform
): boolean {
  return platform === "darwin" && isApplicationBundleEntry(entry);
}

function dataUrlToPngBytes(dataUrl: string | null): Buffer | null {
  if (!dataUrl) {
    return null;
  }

  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/u.exec(dataUrl);
  const encodedBytes = match?.[1];
  if (!encodedBytes) {
    return null;
  }

  const bytes = Buffer.from(encodedBytes, "base64");
  return bytes.byteLength > 0 ? bytes : null;
}

async function readNativeFileIconPngBytes(
  targetPath: string
): Promise<Buffer | null> {
  if (process.platform !== "darwin" && process.platform !== "win32") {
    return null;
  }

  try {
    const { app } = await import("electron");
    const icon = await app.getFileIcon(targetPath, { size: "large" });
    if (icon.isEmpty()) {
      return null;
    }
    return icon
      .resize({ height: entryIconPixelSize, width: entryIconPixelSize })
      .toPNG();
  } catch {
    return null;
  }
}

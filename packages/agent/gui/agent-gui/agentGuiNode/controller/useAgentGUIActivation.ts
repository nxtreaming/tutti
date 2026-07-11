import {
  selectSessionActivationPresentations,
  sessionActivationPresentationMapsEqual,
  type AgentSessionEngine
} from "@tutti-os/agent-activity-core";
import { useCallback, useMemo, useRef } from "react";
import {
  type AppErrorCode,
  type AgentPromptContentBlock
} from "../../../shared/contracts/dto";
import type { AgentSessionComposerSettings } from "../../../shared/agentSessionTypes";
import { useEngineSelector } from "../../../shared/engine/useEngineSelector";

type AgentGUILiveState = "inactive" | "activating" | "active" | "failed";

interface AgentGUIActivateInput {
  agentSessionId: string;
  agentTargetId?: string | null;
  cwd?: string;
  initialContent?: AgentPromptContentBlock[];
  initialDisplayPrompt?: string;
  metadata?: Record<string, unknown>;
  mode: "existing" | "new";
  settings?: AgentSessionComposerSettings;
  title?: string;
  visible?: boolean;
}

interface UseAgentGUIActivationInput {
  engine: AgentSessionEngine;
  workspaceId: string;
  getErrorMessage: (error: unknown) => string;
  getErrorCode?: (error: unknown) => AppErrorCode | null;
}

const ACTIVATION_EXPIRY_MS = 45_000;

export function useAgentGUIActivation({
  engine,
  workspaceId,
  getErrorMessage,
  getErrorCode
}: UseAgentGUIActivationInput) {
  const requestSequenceRef = useRef(0);
  const presentations = useEngineSelector(
    engine,
    selectSessionActivationPresentations,
    sessionActivationPresentationMapsEqual
  );

  const nextRequestId = (kind: string, agentSessionId: string): string => {
    requestSequenceRef.current += 1;
    return `${kind}:${workspaceId}:${agentSessionId}:${Date.now()}:${requestSequenceRef.current}`;
  };

  const activate = useCallback(
    (input: AgentGUIActivateInput): string | null => {
      const agentSessionId = input.agentSessionId.trim();
      const agentTargetId = input.agentTargetId?.trim() ?? "";
      if (!agentSessionId) {
        return null;
      }
      if (input.mode === "new" && !agentTargetId) {
        return null;
      }

      const requestedAtUnixMs = Date.now();
      const requestId = nextRequestId("activation", agentSessionId);
      const clientSubmitId =
        typeof input.metadata?.clientSubmitId === "string"
          ? input.metadata.clientSubmitId.trim()
          : "";
      engine.dispatch({
        type: "activation/requested",
        agentSessionId,
        ...(agentTargetId ? { agentTargetId } : {}),
        ...(clientSubmitId ? { clientSubmitId } : {}),
        ...(input.initialContent ? { content: input.initialContent } : {}),
        ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
        expiresAtUnixMs: requestedAtUnixMs + ACTIVATION_EXPIRY_MS,
        ...(input.initialDisplayPrompt
          ? { initialDisplayPrompt: input.initialDisplayPrompt }
          : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
        mode: input.mode,
        requestedAtUnixMs,
        requestId,
        ...(input.settings
          ? {
              settings: input.settings
            }
          : {}),
        ...(input.title ? { title: input.title } : {}),
        ...(input.visible !== undefined ? { visible: input.visible } : {}),
        workspaceId
      });
      return requestId;
    },
    [engine, workspaceId]
  );

  const unactivate = useCallback(
    (agentSessionId: string): Promise<void> => {
      const normalized = agentSessionId.trim();
      if (!normalized) {
        return Promise.resolve();
      }
      engine.dispatch({
        type: "activation/unactivateRequested",
        agentSessionId: normalized,
        commandId: nextRequestId("unactivate", normalized),
        workspaceId
      });
      return Promise.resolve();
    },
    [engine, workspaceId]
  );

  const markFailed = useCallback(
    (agentSessionId: string, error: unknown): void => {
      const normalized = agentSessionId.trim();
      if (!normalized) {
        return;
      }
      engine.dispatch({
        type: "activation/failureRecorded",
        agentSessionId: normalized,
        errorCode: getErrorCode?.(error) ?? null,
        errorMessage: getErrorMessage(error),
        occurredAtUnixMs: Date.now(),
        requestId: nextRequestId("activation-failure", normalized),
        workspaceId
      });
    },
    [engine, getErrorCode, getErrorMessage, workspaceId]
  );

  const clearFailure = useCallback(
    (agentSessionId: string): void => {
      const normalized = agentSessionId.trim();
      if (normalized) {
        engine.dispatch({
          type: "activation/failureCleared",
          agentSessionId: normalized
        });
      }
    },
    [engine]
  );

  const stateFor = useCallback(
    (agentSessionId: string | null | undefined): AgentGUILiveState =>
      (agentSessionId ? presentations[agentSessionId]?.status : null) ??
      "inactive",
    [presentations]
  );
  const errorFor = useCallback(
    (agentSessionId: string | null | undefined): string | null =>
      (agentSessionId ? presentations[agentSessionId]?.errorMessage : null) ??
      null,
    [presentations]
  );
  const codeFor = useCallback(
    (agentSessionId: string | null | undefined): AppErrorCode | null =>
      ((agentSessionId
        ? presentations[agentSessionId]?.errorCode
        : null) as AppErrorCode | null) ?? null,
    [presentations]
  );

  return useMemo(
    () => ({
      activate,
      clearFailure,
      markFailed,
      unactivate,
      stateFor,
      errorFor,
      codeFor
    }),
    [
      activate,
      clearFailure,
      codeFor,
      errorFor,
      markFailed,
      stateFor,
      unactivate
    ]
  );
}

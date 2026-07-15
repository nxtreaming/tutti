import type { AnalyticsReporterParams } from "../baseReporter.ts";

export interface AgentChatInputFocusedParams extends AnalyticsReporterParams {
  agentSessionId: string | null;
  agentTargetId: string | null;
  composerReady: boolean;
  conversationState: "existing" | "new";
  focusMethod: "keyboard" | "pointer" | "programmatic";
  panelVisitId: string;
  provider: string;
  surface: "standalone_agent" | "workspace";
}

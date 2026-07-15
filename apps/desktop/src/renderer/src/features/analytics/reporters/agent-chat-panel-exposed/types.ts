import type { AnalyticsReporterParams } from "../baseReporter.ts";

export interface AgentChatPanelExposedParams extends AnalyticsReporterParams {
  agentSessionId: string | null;
  agentTargetId: string | null;
  composerReady: boolean;
  conversationState: "existing" | "new";
  panelVisitId: string;
  provider: string;
  surface: "standalone_agent" | "workspace";
}

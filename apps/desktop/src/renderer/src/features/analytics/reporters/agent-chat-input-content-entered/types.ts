import type { AnalyticsReporterParams } from "../baseReporter.ts";

export interface AgentChatInputContentEnteredParams extends AnalyticsReporterParams {
  agentSessionId: string | null;
  agentTargetId: string | null;
  composerReady: boolean;
  contentType: "image" | "large_text" | "text";
  conversationState: "existing" | "new";
  hadPrefill: boolean;
  panelVisitId: string;
  provider: string;
  surface: "standalone_agent" | "workspace";
}

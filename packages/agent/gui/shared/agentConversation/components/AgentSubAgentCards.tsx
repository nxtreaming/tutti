import type { JSX } from "react";
import { translate } from "../../../i18n/index";
import type {
  AgentTaskSubAgentActivityVM,
  AgentTaskSubAgentVM
} from "../contracts/agentTaskItemVM";
import type { AgentToolCallVM } from "../contracts/agentToolCallVM";
import {
  ToolMarkdownBlock,
  ToolSection
} from "./tool-renderers/agentToolContentShared";
import { formatAgentToolDurationMs } from "./tool-renderers/render-data/agentToolRenderData";

// A delegated sub-agent renders as a first-class card in the transcript -
// not nested inside a tool row. The card's identity and status are the
// sub-agent's own (child thread name + lifecycle), never the spawn tool's.
export function AgentSubAgentCards({
  call,
  onLinkClick
}: {
  call: AgentToolCallVM;
  onLinkClick?: (href: string) => void;
}): JSX.Element | null {
  "use memo";
  const subAgents = call.task?.subAgents ?? [];
  if (subAgents.length === 0) {
    return null;
  }
  return (
    <div className="workspace-agents-status-panel__detail-subagents workspace-agents-status-panel__detail-subagents--standalone">
      {subAgents.map((subAgent) => (
        <AgentSubAgentCard
          key={subAgent.ownerThreadId}
          subAgent={subAgent}
          onLinkClick={onLinkClick}
        />
      ))}
    </div>
  );
}

export function AgentSubAgentCard({
  subAgent,
  onLinkClick
}: {
  subAgent: AgentTaskSubAgentVM;
  onLinkClick?: (href: string) => void;
}): JSX.Element {
  "use memo";
  const statusLabel = subAgentStatusLabel(subAgent.status);
  const elapsedText = subAgentElapsedText(subAgent);
  const title = subAgentTitle(subAgent);
  return (
    <details
      className="workspace-agents-status-panel__detail-subagent-card"
      data-status={subAgent.status}
      open={subAgent.status === "running"}
    >
      <summary className="workspace-agents-status-panel__detail-subagent-header">
        <span className="workspace-agents-status-panel__detail-subagent-chevron" />
        <span
          className={`workspace-agents-status-panel__detail-subagent-status workspace-agents-status-panel__detail-subagent-status--${subAgent.status}`}
          role="img"
          aria-label={statusLabel}
        />
        <span className="workspace-agents-status-panel__detail-subagent-title">
          {title}
        </span>
        <span className="workspace-agents-status-panel__detail-subagent-meta">
          {elapsedText ? `${elapsedText} · ` : ""}
          {statusLabel}
        </span>
      </summary>
      <div className="workspace-agents-status-panel__detail-subagent-body">
        {subAgent.task ? (
          <ToolSection
            title={translate("agentHost.agentTool.details.subAgentTask")}
          >
            <ToolMarkdownBlock
              content={subAgent.task}
              onLinkClick={onLinkClick}
            />
          </ToolSection>
        ) : null}
        <ToolSection
          title={translate("agentHost.agentTool.details.subAgentProgress")}
        >
          <SubAgentProgress subAgent={subAgent} />
        </ToolSection>
      </div>
    </details>
  );
}

function SubAgentProgress({
  subAgent
}: {
  subAgent: AgentTaskSubAgentVM;
}): JSX.Element {
  "use memo";
  if (subAgent.activityLog.length === 0 && !subAgent.failureDetail) {
    return (
      <div className="workspace-agents-status-panel__detail-subagent-activity">
        {translate("agentHost.agentTool.details.subAgentStarting")}
      </div>
    );
  }
  return (
    <div className="workspace-agents-status-panel__detail-subagent-log">
      {subAgent.activityOmittedCount > 0 ? (
        <div className="workspace-agents-status-panel__detail-subagent-log-omitted">
          {translate("agentHost.agentTool.details.subAgentEarlierOmitted", {
            count: String(subAgent.activityOmittedCount)
          })}
        </div>
      ) : null}
      {subAgent.activityLog.map((entry, index) => (
        <SubAgentLogEntry
          key={`${entry.kind}:${entry.atUnixMs ?? index}:${index}`}
          entry={entry}
          latest={index === subAgent.activityLog.length - 1}
        />
      ))}
      {subAgent.failureDetail ? (
        <div className="workspace-agents-status-panel__detail-subagent-log-entry workspace-agents-status-panel__detail-subagent-log-entry--failure">
          {subAgent.failureDetail}
        </div>
      ) : null}
    </div>
  );
}

function SubAgentLogEntry({
  entry,
  latest
}: {
  entry: AgentTaskSubAgentActivityVM;
  latest: boolean;
}): JSX.Element {
  "use memo";
  return (
    <div
      className={`workspace-agents-status-panel__detail-subagent-log-entry workspace-agents-status-panel__detail-subagent-log-entry--${entry.kind}${
        latest
          ? " workspace-agents-status-panel__detail-subagent-log-entry--latest"
          : ""
      }`}
    >
      {entry.text}
    </div>
  );
}

function subAgentTitle(subAgent: AgentTaskSubAgentVM): string {
  if (subAgent.name) {
    return subAgent.name;
  }
  const base = translate("agentHost.agentTool.details.subAgentFallbackName");
  return subAgent.laneCount > 1 ? `${base} ${subAgent.laneIndex}` : base;
}

function subAgentStatusLabel(status: AgentTaskSubAgentVM["status"]): string {
  switch (status) {
    case "completed":
      return translate("agentHost.agentTool.statusCompleted");
    case "failed":
      return translate("agentHost.agentTool.statusFailed");
    case "canceled":
      return translate("agentHost.agentTool.statusCanceled");
    case "running":
    default:
      return translate("agentHost.agentTool.statusWorking");
  }
}

function subAgentElapsedText(subAgent: AgentTaskSubAgentVM): string | null {
  const started = subAgent.startedAtUnixMs;
  const latest = subAgent.latestActivityAtUnixMs;
  if (
    typeof started !== "number" ||
    typeof latest !== "number" ||
    latest <= started
  ) {
    return null;
  }
  return formatAgentToolDurationMs(latest - started);
}

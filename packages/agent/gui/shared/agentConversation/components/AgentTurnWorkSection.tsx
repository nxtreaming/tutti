import { useMemo, type JSX, type ReactNode } from "react";
import type { AgentActivityTurn } from "@tutti-os/agent-activity-core";
import { BareIconButton } from "@tutti-os/ui-system/components";
import { ChevronDownIcon } from "@tutti-os/ui-system/icons";
import { useTranslation } from "../../../i18n/index";
import { CollapsibleReveal } from "./CollapsibleReveal";
import type { AgentTranscriptTurnGroup } from "./agentTranscriptModel";
import type { AgentTurnDisclosureStore } from "./AgentTurnDisclosureContext";
import { useElapsedSeconds } from "./useElapsedSeconds";
import {
  buildAgentTurnWorkSectionModel,
  formatAgentTurnDuration,
  type AgentTurnDuration,
  type AgentTurnTiming,
  type AgentTurnWorkSectionRow
} from "./agentTurnWorkSectionModel";

interface AgentTurnWorkSectionProps {
  group: AgentTranscriptTurnGroup;
  sessionId: string;
  turn: AgentActivityTurn | null;
  isActiveTurn: boolean;
  disclosureStore: AgentTurnDisclosureStore;
  renderRow: (
    row: AgentTranscriptTurnGroup["rows"][number]["row"],
    rowIndex: number,
    renderKey?: string
  ) => JSX.Element;
}

export function AgentTurnWorkSection({
  group,
  sessionId,
  turn,
  isActiveTurn,
  disclosureStore,
  renderRow
}: AgentTurnWorkSectionProps): JSX.Element {
  const { t } = useTranslation();
  const model = useMemo(
    () => buildAgentTurnWorkSectionModel(group, turn, isActiveTurn),
    [group, isActiveTurn, turn]
  );
  const disclosureKey = `${sessionId}:${group.turnId ?? group.key}`;
  const expanded = model.collapseEligible
    ? (disclosureStore.expandedOverrides[disclosureKey] ?? false)
    : true;

  if (!model.timing) {
    return <>{renderRows(group.rows, renderRow)}</>;
  }

  const toggleLabel = expanded
    ? t("agentHost.agentGui.collapseTurnWork")
    : t("agentHost.agentGui.expandTurnWork");

  return (
    <>
      {renderRows(model.userRows, renderRow)}
      <div
        className="flex min-h-6 items-center gap-0.5 text-[12px] text-[var(--text-tertiary)]"
        data-agent-turn-work-header={group.turnId ?? group.key}
      >
        <AgentTurnDurationLabel timing={model.timing} />
        {model.collapseEligible ? (
          <BareIconButton
            size="sm"
            aria-label={toggleLabel}
            aria-expanded={expanded}
            title={toggleLabel}
            onClick={() =>
              disclosureStore.setExpandedOverride(disclosureKey, !expanded)
            }
          >
            <ChevronDownIcon
              aria-hidden="true"
              className={`transition-transform duration-150 ${
                expanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          </BareIconButton>
        ) : null}
      </div>
      {model.workRowsBeforeFinal.length > 0 ? (
        <CollapsibleReveal expanded={expanded}>
          {renderRows(model.workRowsBeforeFinal, renderRow)}
        </CollapsibleReveal>
      ) : null}
      {renderRows(model.finalRows, renderRow)}
      {model.workRowsAfterFinal.length > 0 ? (
        <CollapsibleReveal expanded={expanded}>
          {renderRows(model.workRowsAfterFinal, renderRow)}
        </CollapsibleReveal>
      ) : null}
    </>
  );
}

function renderRows(
  rows: readonly AgentTurnWorkSectionRow[],
  renderRow: AgentTurnWorkSectionProps["renderRow"]
): ReactNode {
  return rows.map(({ row, rowIndex, renderKey }) =>
    renderRow(row, rowIndex, renderKey)
  );
}

function AgentTurnDurationLabel({
  timing
}: {
  timing: AgentTurnTiming;
}): JSX.Element {
  const { t } = useTranslation();
  const liveElapsedSeconds = useElapsedSeconds(
    timing.kind === "live" ? timing.startedAtUnixMs : null
  );
  const elapsedSeconds =
    timing.kind === "live" ? (liveElapsedSeconds ?? 0) : timing.elapsedSeconds;
  return <span>{translateDuration(t, timing.kind, elapsedSeconds)}</span>;
}

function translateDuration(
  t: ReturnType<typeof useTranslation>["t"],
  kind: AgentTurnTiming["kind"],
  elapsedSeconds: number
): string {
  const duration = formatAgentTurnDuration(elapsedSeconds);
  return kind === "live"
    ? translateLiveDuration(t, duration)
    : translateSettledDuration(t, duration);
}

function translateLiveDuration(
  t: ReturnType<typeof useTranslation>["t"],
  duration: AgentTurnDuration
): string {
  if (duration.kind === "seconds") {
    return t("agentHost.agentGui.turnProcessedSeconds", {
      seconds: duration.seconds
    });
  }
  if (duration.kind === "minutes") {
    return t("agentHost.agentGui.turnProcessedMinutes", {
      minutes: duration.minutes
    });
  }
  return t("agentHost.agentGui.turnProcessedMinutesSeconds", {
    minutes: duration.minutes,
    seconds: duration.seconds
  });
}

function translateSettledDuration(
  t: ReturnType<typeof useTranslation>["t"],
  duration: AgentTurnDuration
): string {
  if (duration.kind === "seconds") {
    return t("agentHost.agentGui.turnTotalSeconds", {
      seconds: duration.seconds
    });
  }
  if (duration.kind === "minutes") {
    return t("agentHost.agentGui.turnTotalMinutes", {
      minutes: duration.minutes
    });
  }
  return t("agentHost.agentGui.turnTotalMinutesSeconds", {
    minutes: duration.minutes,
    seconds: duration.seconds
  });
}

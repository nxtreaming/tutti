import {
  agentGUIProviderIdentityDisplayName,
  resolveMigratedAgentGUIProviderIdentity
} from "../providerIdentityCatalog.ts";
import { translate } from "../i18n/index.ts";

export function workspaceAgentProviderLabel(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  const migratedIdentity = resolveMigratedAgentGUIProviderIdentity(normalized);
  if (migratedIdentity) {
    return agentGUIProviderIdentityDisplayName(migratedIdentity, translate);
  }
  switch (normalized) {
    case "claude-code":
      return "Claude Code";
    case "openclaw":
      return "OpenClaw";
    case "opencode":
      return "OpenCode";
    case "hermes":
      return "Hermes";
    case "nexight":
      return "Nexight";
    case "unknown":
      return "Unknown";
    default:
      return titleCase(provider);
  }
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

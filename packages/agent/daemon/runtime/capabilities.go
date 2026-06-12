package agentruntime

// Canonical provider capability keys shared by all adapters and surfaced to
// the GUI through runtimeContext.capabilities. Keep in sync with the
// TypeScript side (packages/agent/activity-core/src/capabilities.ts).
const (
	CapabilityImageInput = "imageInput"
	CapabilitySkills     = "skills"
	CapabilityCompact    = "compact"
	CapabilityTokenUsage = "tokenUsage"
	CapabilityRateLimits = "rateLimits"
	CapabilityPlanMode   = "planMode"
	CapabilityInterrupt  = "interrupt"
)

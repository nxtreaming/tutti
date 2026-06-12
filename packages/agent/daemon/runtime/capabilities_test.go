package agentruntime

import "testing"

func TestCodexAppServerCapabilitiesUseSharedVocabulary(t *testing.T) {
	t.Parallel()
	capabilities := codexAppServerCapabilities()
	for _, want := range []string{
		CapabilityImageInput,
		CapabilitySkills,
		CapabilityCompact,
		CapabilityTokenUsage,
		CapabilityRateLimits,
		CapabilityInterrupt,
	} {
		if !containsString(capabilities, want) {
			t.Fatalf("codex capabilities = %v, missing %q", capabilities, want)
		}
	}
	if containsString(capabilities, CapabilityPlanMode) {
		t.Fatalf("codex must not advertise planMode")
	}
}

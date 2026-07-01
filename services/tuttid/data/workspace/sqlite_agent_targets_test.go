package workspace

import (
	"context"
	"errors"
	"testing"

	agenttargetbiz "github.com/tutti-os/tutti/services/tuttid/biz/agenttarget"
)

func TestSQLiteStoreSeedsSystemAgentTargets(t *testing.T) {
	t.Parallel()

	store := openTestSQLiteStore(t)

	targets, err := store.ListAgentTargets(context.Background())
	if err != nil {
		t.Fatalf("ListAgentTargets() error = %v", err)
	}
	if len(targets) != 2 {
		t.Fatalf("ListAgentTargets() len = %d, want 2", len(targets))
	}
	if targets[0].ID != agenttargetbiz.IDLocalCodex || targets[0].Provider != "codex" {
		t.Fatalf("first target = %#v, want local codex", targets[0])
	}
	if targets[1].ID != agenttargetbiz.IDLocalClaudeCode || targets[1].Provider != "claude-code" {
		t.Fatalf("second target = %#v, want local claude-code", targets[1])
	}
	for _, target := range targets {
		if target.Source != agenttargetbiz.SourceSystem {
			t.Fatalf("target %q source = %q, want system", target.ID, target.Source)
		}
		if !target.Enabled {
			t.Fatalf("target %q enabled = false, want true", target.ID)
		}
		if _, err := agenttargetbiz.CanonicalLaunchRefJSONString(target.Provider, target.LaunchRefJSON); err != nil {
			t.Fatalf("target %q launch ref invalid: %v", target.ID, err)
		}
	}
}

func TestSQLiteStorePutAgentTargetRejectsInvalidLaunchRefs(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		name          string
		provider      string
		launchRefJSON string
	}{
		{
			name:          "unknown type",
			provider:      "codex",
			launchRefJSON: `{"type":"agent_profile","provider":"codex"}`,
		},
		{
			name:          "provider mismatch",
			provider:      "codex",
			launchRefJSON: `{"type":"local_cli","provider":"claude-code"}`,
		},
		{
			name:          "config blob",
			provider:      "codex",
			launchRefJSON: `{"type":"local_cli","provider":"codex","model":"gpt-5"}`,
		},
		{
			name:          "prompt config",
			provider:      "codex",
			launchRefJSON: `{"type":"local_cli","provider":"codex","prompt":"always plan"}`,
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			store := openTestSQLiteStore(t)
			_, err := store.PutAgentTarget(context.Background(), agenttargetbiz.Target{
				ID:            "custom",
				Provider:      tc.provider,
				LaunchRefJSON: tc.launchRefJSON,
				Name:          "Custom",
				Enabled:       true,
				Source:        agenttargetbiz.SourceUser,
			})
			if !errors.Is(err, agenttargetbiz.ErrInvalidLaunchRef) {
				t.Fatalf("PutAgentTarget() error = %v, want ErrInvalidLaunchRef", err)
			}
		})
	}
}

func TestSQLiteStorePutAgentTargetCanonicalizesLaunchRef(t *testing.T) {
	t.Parallel()

	store := openTestSQLiteStore(t)
	target, err := store.PutAgentTarget(context.Background(), agenttargetbiz.Target{
		ID:            "custom-codex",
		Provider:      " codex ",
		LaunchRefJSON: `{"provider":"codex","type":"local_cli"}`,
		Name:          " Custom Codex ",
		Enabled:       true,
		Source:        agenttargetbiz.SourceUser,
		SortOrder:     30,
	})
	if err != nil {
		t.Fatalf("PutAgentTarget() error = %v", err)
	}
	if target.LaunchRefJSON != `{"type":"local_cli","provider":"codex"}` {
		t.Fatalf("LaunchRefJSON = %q, want canonical local_cli codex", target.LaunchRefJSON)
	}
	if target.Name != "Custom Codex" {
		t.Fatalf("Name = %q, want trimmed Custom Codex", target.Name)
	}
}

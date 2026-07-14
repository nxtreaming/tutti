package storesqlite

import (
	"context"
	"testing"
)

func TestSessionTitleMigrationCanonicalizesExistingRows(t *testing.T) {
	t.Parallel()

	store := openTestStore(t, testOptions(&staticProjectPaths{}))
	ctx := context.Background()
	if _, err := store.db.ExecContext(ctx, `
INSERT INTO workspace_agent_sessions (workspace_id, agent_session_id, title, created_at_unix_ms, updated_at_unix_ms)
VALUES ('ws-title', 'session-title', '[@file](file:///tmp/a_(final).md)', 1, 1)
`); err != nil {
		t.Fatalf("insert legacy title: %v", err)
	}
	if _, err := store.db.ExecContext(ctx, `DELETE FROM agent_store_schema_migrations WHERE id = ?`, schemaMigrationWorkspaceAgentSessionTitlesV1); err != nil {
		t.Fatalf("reset title migration marker: %v", err)
	}
	if err := store.Migrate(ctx); err != nil {
		t.Fatalf("rerun title migration: %v", err)
	}
	var title string
	if err := store.db.QueryRowContext(ctx, `
SELECT title FROM workspace_agent_sessions
WHERE workspace_id = 'ws-title' AND agent_session_id = 'session-title'
`).Scan(&title); err != nil {
		t.Fatalf("read canonicalized title: %v", err)
	}
	if title != "@file" {
		t.Fatalf("migrated title = %q, want @file", title)
	}
}

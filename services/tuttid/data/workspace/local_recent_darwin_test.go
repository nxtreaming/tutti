//go:build darwin

package workspace

import (
	"strings"
	"testing"
)

func TestFinderRecentSpotlightQueryKeepsOlderOpenedFiles(t *testing.T) {
	if strings.Contains(finderRecentSpotlightQuery, "$time") {
		t.Fatalf("query = %q, want no rolling date window", finderRecentSpotlightQuery)
	}
	if !strings.Contains(finderRecentSpotlightQuery, "kMDItemLastUsedDate == *") {
		t.Fatalf("query = %q, want all opened files", finderRecentSpotlightQuery)
	}
}

func TestFinderRecentSpotlightQueryExcludesFinderNoise(t *testing.T) {
	for _, predicate := range []string{
		"kMDItemContentTypeTree != 'public.folder'",
		"kMDItemFSName != '*.download'cd",
	} {
		if !strings.Contains(finderRecentSpotlightQuery, predicate) {
			t.Fatalf("query = %q, want predicate %q", finderRecentSpotlightQuery, predicate)
		}
	}
}

import type { RichTextAtQueryMatch } from "../types/at.ts";
import type {
  MentionPaletteGroup,
  MentionPaletteState
} from "./mentionPaletteTypes.ts";
import { groupRichTextAtMatches } from "./searchHelpers.ts";
import type { RichTextAtProviderGroup } from "./types.ts";

export function buildMentionPaletteState(input: {
  matches: readonly RichTextAtQueryMatch[];
  providerGroups: readonly RichTextAtProviderGroup[];
  filterTabs: readonly { id: string; label: string }[];
  activeFilterId: string;
  expandedCounts: Record<string, number | undefined>;
  query: string;
  isLoading: boolean;
  pageSize?: number;
  showMoreLabel?: (count: number) => string;
}): MentionPaletteState<RichTextAtQueryMatch> {
  const searchGroups = groupRichTextAtMatches({
    expandedCounts: input.expandedCounts,
    filterId: input.activeFilterId,
    groups: input.providerGroups,
    matches: input.matches,
    pageSize: input.pageSize
  });

  const groups: readonly MentionPaletteGroup<RichTextAtQueryMatch>[] =
    searchGroups.map((group) => ({
      id: group.id,
      label: group.label,
      items: group.items,
      totalCount: group.totalCount,
      visibleCount: group.visibleCount,
      hasMore: group.hasMore,
      emptyLabel: group.emptyLabel,
      expandLabel:
        group.hasMore && input.showMoreLabel != null
          ? input.showMoreLabel(group.totalCount - group.visibleCount)
          : undefined
    }));

  const categories = input.filterTabs;
  const filter = input.activeFilterId;
  const query = input.query;
  const isEmptyQuery = query === "";

  if (input.isLoading) {
    return {
      status: "loading",
      query,
      mode: isEmptyQuery ? "browse" : "results",
      filter,
      categories,
      groups,
      error: null
    };
  }

  if (isEmptyQuery) {
    return {
      status: "idle",
      query,
      mode: "browse",
      filter,
      categories,
      groups,
      error: null
    };
  }

  return {
    status: "ready",
    query,
    mode: "results",
    filter,
    categories,
    groups,
    error: null
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceFileEntry } from "../services/workspaceFileManagerTypes.ts";
import {
  resolveWorkspaceFileEntryIconCacheKey,
  shouldResolveWorkspaceFileEntryIcon
} from "./workspaceFileEntryIconPolicy.ts";
import {
  createWorkspaceFileEntryIconUrlQueue,
  type WorkspaceFileEntryIconUrlResolver
} from "./workspaceFileEntryIconUrlQueue.ts";

function buildIconTargetSignature(
  entries: readonly WorkspaceFileEntry[]
): string {
  return entries
    .filter(shouldResolveWorkspaceFileEntryIcon)
    .map((entry) => resolveWorkspaceFileEntryIconCacheKey(entry))
    .join("\0");
}

export function useWorkspaceFileEntryIconUrls(input: {
  entries: readonly WorkspaceFileEntry[];
  resolveEntryIconUrl?: WorkspaceFileEntryIconUrlResolver;
}): {
  iconUrlByCacheKey: ReadonlyMap<string, string | null>;
  reportEntryIconViewportEnter: (entry: WorkspaceFileEntry) => void;
  reportEntryIconViewportLeave: (entry: WorkspaceFileEntry) => void;
} {
  const { entries, resolveEntryIconUrl } = input;
  const queue = useMemo(
    () =>
      createWorkspaceFileEntryIconUrlQueue({
        resolveEntryIconUrl
      }),
    [resolveEntryIconUrl]
  );
  const [iconUrlByCacheKey, setIconUrlByCacheKey] = useState<
    ReadonlyMap<string, string | null>
  >(() => queue.snapshot());
  const iconTargetSignature = useMemo(
    () => buildIconTargetSignature(entries),
    [entries]
  );

  useEffect(() => {
    queue.retainEntries(entries);
  }, [entries, iconTargetSignature, queue]);

  useEffect(() => {
    setIconUrlByCacheKey(queue.snapshot());
    return queue.subscribe(() => {
      setIconUrlByCacheKey(queue.snapshot());
    });
  }, [queue]);

  useEffect(
    () => () => {
      queue.dispose();
    },
    [queue]
  );

  const reportEntryIconViewportEnter = useCallback(
    (entry: WorkspaceFileEntry) => {
      queue.enterViewport(entry);
    },
    [queue]
  );

  const reportEntryIconViewportLeave = useCallback(
    (entry: WorkspaceFileEntry) => {
      queue.leaveViewport(entry);
    },
    [queue]
  );

  return {
    iconUrlByCacheKey,
    reportEntryIconViewportEnter,
    reportEntryIconViewportLeave
  };
}

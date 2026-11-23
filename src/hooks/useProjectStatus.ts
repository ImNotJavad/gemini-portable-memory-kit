import { useEffect, useMemo, useRef, useState } from 'react';
import { parseProjectSummaryStatus, type ProjectStatusSummary } from '../lib/projectStatus';
import type { AuditReport, MemoryWorkspacePayload } from '../types/memory';

export interface UseProjectStatusResult {
  status: ProjectStatusSummary;
  refreshedCount: number;
}

/**
 * React hook that parses the latest project summary status from loaded
 * memory files and refreshes reactively whenever workspace or audit data updates.
 */
export function useProjectStatus(
  workspace: MemoryWorkspacePayload | null,
  audit: AuditReport | null
): UseProjectStatusResult {
  const [refreshedCount, setRefreshedCount] = useState(0);
  const previousSignatureRef = useRef<string>('');

  const status = useMemo(
    () => parseProjectSummaryStatus(workspace, audit),
    [workspace, audit]
  );

  useEffect(() => {
    if (!workspace) return;
    const signature = [
      status.health,
      status.brief,
      status.lastUpdated ?? '',
      status.summaryHeadline,
      audit?.checkedAt ?? '',
    ].join('|');

    if (signature !== previousSignatureRef.current) {
      previousSignatureRef.current = signature;
      setRefreshedCount((count) => count + 1);
    }
  }, [workspace, audit?.checkedAt, status]);

  return { status, refreshedCount };
}

import type { AuditReport, MemoryWorkspacePayload } from '../types/memory';

export type ProjectHealthState = 'loading' | 'healthy' | 'attention' | 'critical';

export interface TaskCompletionStats {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  completionPercent: number;
}

export interface ProjectStatusSummary {
  health: ProjectHealthState;
  label: string;
  brief: string;
  lastUpdated: string | null;
  summaryHeadline: string;
  nextTask: string | null;
  activeDecisions: number;
  openTasks: number;
  warningCount: number;
}

const COMPLETED_TASK_STATUSES = new Set(['obsolete', 'completed', 'done', 'closed']);

/**
 * Calculate completed vs total workspace tasks from open-tasks.md.
 * Per memory/policies.md, completed open tasks are marked obsolete/completed.
 */
export function computeTaskCompletion(
  workspace: MemoryWorkspacePayload | null
): TaskCompletionStats {
  if (!workspace) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      openTasks: 0,
      completionPercent: 0,
    };
  }

  const tasksFile = workspace.files.find((f) => f.id === 'open-tasks');
  const entries = tasksFile?.entries ?? [];
  const totalTasks = entries.length;
  const completedTasks = entries.filter((entry) =>
    COMPLETED_TASK_STATUSES.has(entry.status.trim().toLowerCase())
  ).length;
  const openTasks = Math.max(0, totalTasks - completedTasks);
  const completionPercent =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    totalTasks,
    completedTasks,
    openTasks,
    completionPercent,
  };
}

const LAST_UPDATED_RE = /^\s*Last\s+Updated\s*:\s*(\d{4}-\d{2}-\d{2})\s*$/im;
const LAST_REVIEWED_RE = /^\s*-\s*Last\s+Reviewed\s*:\s*(\d{4}-\d{2}-\d{2})\s*$/im;

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function extractCurrentSummarySection(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let inSummary = false;
  const collected: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (/^##\s+Current\s+Summary\b/i.test(trimmed)) {
      inSummary = true;
      continue;
    }
    if (inSummary && /^##\s+/.test(trimmed)) {
      break;
    }
    if (inSummary && trimmed) {
      collected.push(trimmed);
    }
  }

  return collected.join(' ').trim();
}

function extractTopOpenTask(workspace: MemoryWorkspacePayload): string | null {
  const tasksFile = workspace.files.find((f) => f.id === 'open-tasks');
  if (!tasksFile) return null;

  const activeTasks = tasksFile.entries
    .filter((entry) => entry.status === 'active')
    .sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 2;
      const pb = PRIORITY_RANK[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.title.localeCompare(b.title);
    });

  return activeTasks[0]?.title ?? null;
}

/**
 * Pure utility function that parses the latest project summary status
 * and computes workspace health from loaded memory files and audit results.
 */
export function parseProjectSummaryStatus(
  workspace: MemoryWorkspacePayload | null,
  audit: AuditReport | null
): ProjectStatusSummary {
  if (!workspace) {
    return {
      health: 'loading',
      label: 'Syncing',
      brief: 'Loading memory',
      lastUpdated: null,
      summaryHeadline: 'Reading project memory files.',
      nextTask: null,
      activeDecisions: 0,
      openTasks: 0,
      warningCount: 0,
    };
  }

  const summariesFile = workspace.files.find((f) => f.id === 'summaries');
  const indexFile = workspace.files.find((f) => f.id === 'agent-memory');

  const summaryDateMatch = summariesFile?.content.match(LAST_UPDATED_RE);
  const indexDateMatch = indexFile?.content.match(LAST_REVIEWED_RE);
  const lastUpdated = summaryDateMatch?.[1] ?? indexDateMatch?.[1] ?? null;

  const parsedSummary = summariesFile
    ? extractCurrentSummarySection(summariesFile.content)
    : '';
  const summaryHeadline =
    parsedSummary ||
    `Tracking ${workspace.stats.activeDecisions} active decisions and ${workspace.stats.openTasks} open tasks.`;

  const nextTask = extractTopOpenTask(workspace);
  const activeDecisions = workspace.stats.activeDecisions;
  const openTasks = workspace.stats.openTasks;

  const secretCount = audit?.secretFindings.length ?? 0;
  const errorIssues = audit?.validationIssues.filter((i) => i.severity === 'error').length ?? 0;
  const warningIssues = audit?.validationIssues.filter((i) => i.severity === 'warning').length ?? 0;
  const obsoleteCount = audit?.obsoleteFindings.length ?? workspace.stats.obsoleteEntries;
  const warningCount = secretCount + errorIssues + warningIssues + obsoleteCount;

  let health: ProjectHealthState = 'healthy';
  let label = 'Healthy';
  let brief = `${activeDecisions} ${activeDecisions === 1 ? 'decision' : 'decisions'} · ${openTasks} ${openTasks === 1 ? 'task' : 'tasks'}`;

  if (secretCount > 0 || errorIssues > 0) {
    health = 'critical';
    label = 'Alert';
    const parts: string[] = [];
    if (secretCount > 0) {
      parts.push(`${secretCount} secret ${secretCount === 1 ? 'alert' : 'alerts'}`);
    }
    if (errorIssues > 0) {
      parts.push(`${errorIssues} budget ${errorIssues === 1 ? 'error' : 'errors'}`);
    }
    brief = parts.join(' · ');
  } else if (warningIssues > 0 || obsoleteCount > 0) {
    health = 'attention';
    label = 'Review';
    const parts: string[] = [];
    if (warningIssues > 0) {
      parts.push(`${warningIssues} ${warningIssues === 1 ? 'warning' : 'warnings'}`);
    }
    if (obsoleteCount > 0) {
      parts.push(`${obsoleteCount} obsolete`);
    }
    brief = parts.join(' · ');
  }

  return {
    health,
    label,
    brief,
    lastUpdated,
    summaryHeadline,
    nextTask,
    activeDecisions,
    openTasks,
    warningCount,
  };
}

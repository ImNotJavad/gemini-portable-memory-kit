import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTaskCompletion, parseProjectSummaryStatus } from './projectStatus';
import { addRecentSearch, removeRecentSearch } from './searchHistory';
import type { AuditReport, MemoryWorkspacePayload } from '../types/memory';

function buildSampleWorkspace(): MemoryWorkspacePayload {
  return {
    files: [
      {
        id: 'agent-memory',
        name: 'AGENT_MEMORY.md',
        relativePath: 'AGENT_MEMORY.md',
        category: 'index',
        description: 'Index',
        content: '# Agent Memory Index\n- Last Reviewed: 2026-11-22\n',
        lineCount: 2,
        lineBudget: 100,
        entries: [],
      },
      {
        id: 'summaries',
        name: 'summaries.md',
        relativePath: 'memory/summaries.md',
        category: 'memory',
        description: 'Rolling summary',
        content: [
          '# Rolling Memory Summary',
          '',
          'Last Updated: 2026-11-23',
          '',
          '## Current Summary',
          'Tracking 4 active decisions and 2 active lessons.',
          '',
          '## Key Active Decisions',
          '- Example',
        ].join('\n'),
        lineCount: 9,
        lineBudget: 150,
        entries: [],
      },
      {
        id: 'open-tasks',
        name: 'open-tasks.md',
        relativePath: 'memory/open-tasks.md',
        category: 'memory',
        description: 'Open tasks',
        content: '',
        lineCount: 5,
        lineBudget: 150,
        entries: [
          {
            id: 'open-tasks:1',
            date: '2026-11-22',
            title: 'Low Priority Cleanup',
            type: 'open task',
            status: 'active',
            priority: 'low',
            tags: [],
            details: '',
            reason: '',
            relatedFiles: [],
            nextAction: '',
            source: 'agent',
            confidence: 'confirmed',
            lineNumber: 1,
          },
          {
            id: 'open-tasks:10',
            date: '2026-11-23',
            title: 'Critical Release Verification',
            type: 'open task',
            status: 'active',
            priority: 'critical',
            tags: [],
            details: '',
            reason: '',
            relatedFiles: [],
            nextAction: '',
            source: 'user',
            confidence: 'confirmed',
            lineNumber: 10,
          },
        ],
      },
    ],
    relations: [],
    stats: {
      totalFiles: 3,
      totalEntries: 2,
      activeEntries: 2,
      obsoleteEntries: 0,
      activeDecisions: 4,
      openTasks: 2,
    },
  };
}

const CLEAN_AUDIT: AuditReport = {
  checkedAt: '2026-11-23T00:00:00.000Z',
  scannedFiles: 3,
  secretFindings: [],
  obsoleteFindings: [],
  validationIssues: [],
};

test('parseProjectSummaryStatus returns loading state when workspace is null', () => {
  const result = parseProjectSummaryStatus(null, null);
  assert.equal(result.health, 'loading');
  assert.equal(result.label, 'Syncing');
});

test('parseProjectSummaryStatus parses summaries.md date, headline, and highest-priority next task', () => {
  const result = parseProjectSummaryStatus(buildSampleWorkspace(), CLEAN_AUDIT);
  assert.equal(result.health, 'healthy');
  assert.equal(result.label, 'Healthy');
  assert.equal(result.lastUpdated, '2026-11-23');
  assert.equal(result.summaryHeadline, 'Tracking 4 active decisions and 2 active lessons.');
  assert.equal(result.nextTask, 'Critical Release Verification');
  assert.equal(result.brief, '4 decisions · 2 tasks');
  assert.equal(result.warningCount, 0);
});

test('parseProjectSummaryStatus reports attention when obsolete entries or warnings exist', () => {
  const audit: AuditReport = {
    ...CLEAN_AUDIT,
    obsoleteFindings: [
      {
        relativePath: 'memory/decisions.md',
        fileName: 'decisions.md',
        lineNumber: 12,
        title: 'Old Decision',
      },
    ],
  };
  const result = parseProjectSummaryStatus(buildSampleWorkspace(), audit);
  assert.equal(result.health, 'attention');
  assert.equal(result.label, 'Review');
  assert.equal(result.brief, '1 obsolete');
  assert.equal(result.warningCount, 1);
});

test('parseProjectSummaryStatus reports critical when secrets or budget errors are detected', () => {
  const audit: AuditReport = {
    ...CLEAN_AUDIT,
    secretFindings: [
      {
        relativePath: 'memory/open-tasks.md',
        lineNumber: 7,
        ruleName: 'API Key Assignment',
      },
    ],
  };
  const result = parseProjectSummaryStatus(buildSampleWorkspace(), audit);
  assert.equal(result.health, 'critical');
  assert.equal(result.label, 'Alert');
  assert.equal(result.brief, '1 secret alert');
  assert.equal(result.warningCount, 1);
});

test('computeTaskCompletion computes 0%, partial %, and 100% accurately', () => {
  assert.deepEqual(computeTaskCompletion(null), {
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0,
    completionPercent: 0,
  });

  const ws = buildSampleWorkspace();
  assert.deepEqual(computeTaskCompletion(ws), {
    totalTasks: 2,
    completedTasks: 0,
    openTasks: 2,
    completionPercent: 0,
  });

  // Mark one task obsolete (completed per memory/policies.md)
  ws.files[2].entries[0].status = 'obsolete';
  assert.deepEqual(computeTaskCompletion(ws), {
    totalTasks: 2,
    completedTasks: 1,
    openTasks: 1,
    completionPercent: 50,
  });

  // Mark both completed
  ws.files[2].entries[1].status = 'completed';
  assert.deepEqual(computeTaskCompletion(ws), {
    totalTasks: 2,
    completedTasks: 2,
    openTasks: 0,
    completionPercent: 100,
  });
});

test('addRecentSearch deduplicates case-insensitively, reorders, and caps at 5 queries', () => {
  let history: string[] = [];
  for (const term of ['one', 'two', 'three', 'four', 'five', 'six']) {
    history = addRecentSearch(history, term);
  }
  assert.deepEqual(history, ['six', 'five', 'four', 'three', 'two']);

  // Re-running an existing query with different casing moves it to front without duplicating
  history = addRecentSearch(history, 'THREE');
  assert.deepEqual(history, ['THREE', 'six', 'five', 'four', 'two']);

  // Empty/whitespace query is ignored
  assert.deepEqual(addRecentSearch(history, '   '), history);

  // Removing a query deletes case-insensitively
  assert.deepEqual(removeRecentSearch(history, 'three'), ['six', 'five', 'four', 'two']);
});

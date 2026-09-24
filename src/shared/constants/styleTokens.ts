/**
 * Centralised style tokens for priority and status badges.
 * All classes reference CSS-variable-backed Tailwind tokens — no hardcoded colors.
 * Import from here instead of defining per-component Record maps.
 */

// ─── Priority ─────────────────────────────────────────────────────────────────

/** Solid pill — used on kanban cards and lead/task detail modal headers. */
export const PRIORITY_BADGE: Record<string, string> = {
  low:    "bg-priority-low    text-priority-low-foreground",
  medium: "bg-priority-medium text-priority-medium-foreground",
  high:   "bg-priority-high   text-priority-high-foreground",
};

/** Soft pill, no border — used on detail pages. */
export const PRIORITY_SOFT: Record<string, string> = {
  low:    "bg-priority-low/15    text-priority-low",
  medium: "bg-priority-medium/15 text-priority-medium",
  high:   "bg-priority-high/15   text-priority-high",
};

/** Soft pill with border — used in tables. */
export const PRIORITY_SOFT_BORDER: Record<string, string> = {
  low:    "bg-priority-low/15    text-priority-low    border-priority-low/30",
  medium: "bg-priority-medium/15 text-priority-medium border-priority-medium/30",
  high:   "bg-priority-high/15   text-priority-high   border-priority-high/30",
};

// ─── Lead ─────────────────────────────────────────────────────────────────────

/** Kanban card background + border by priority level. */
export const LEAD_CARD_BG: Record<string, string> = {
  low:    "bg-priority-low/10    border-priority-low/25",
  medium: "bg-priority-medium/10 border-priority-medium/25",
  high:   "bg-priority-high/10   border-priority-high/25",
};

/** Solid pill — used in lead detail modal header. */
export const LEAD_STATUS_BADGE: Record<string, string> = {
  new:             "bg-lead-status-new        text-lead-status-new-foreground",
  contacted:       "bg-lead-status-contacted  text-lead-status-contacted-foreground",
  walkthrough:     "bg-lead-status-walkthrough text-lead-status-walkthrough-foreground",
  "estimate send": "bg-lead-status-estimate   text-lead-status-estimate-foreground",
  decision:        "bg-lead-status-decision   text-lead-status-decision-foreground",
};

// ─── Task ─────────────────────────────────────────────────────────────────────

/** Soft pill with border — used in tasks table. */
export const TASK_STATUS_SOFT: Record<string, string> = {
  "to do":       "bg-task-status-todo/15      text-task-status-todo      border-task-status-todo/30",
  "in progress": "bg-task-status-progress/15  text-task-status-progress  border-task-status-progress/30",
  completed:     "bg-task-status-completed/15 text-task-status-completed border-task-status-completed/30",
};

/** Soft pill, no border — used in task detail modal info section. */
export const TASK_STATUS_BADGE: Record<string, string> = {
  "to do":       "bg-task-status-todo/15      text-task-status-todo",
  "in progress": "bg-task-status-progress/15  text-task-status-progress",
  completed:     "bg-task-status-completed/15 text-task-status-completed",
};

/** Solid pill — used in task detail modal dark header. */
export const TASK_STATUS_HEADER_BADGE: Record<string, string> = {
  "to do":       "bg-task-status-todo      text-task-status-todo-foreground",
  "in progress": "bg-task-status-progress  text-task-status-progress-foreground",
  completed:     "bg-task-status-completed text-task-status-completed-foreground",
};

// ─── Client ───────────────────────────────────────────────────────────────────

/** Solid pill — used in client detail modal header. */
export const CLIENT_STATUS_BADGE: Record<string, string> = {
  active:   "bg-client-status-active   text-client-status-active-foreground",
  inactive: "bg-client-status-inactive text-client-status-inactive-foreground",
};

/** Soft pill with border — used in clients table. */
export const CLIENT_STATUS_TABLE: Record<string, string> = {
  active:   "bg-client-status-active/15   text-client-status-active   border-client-status-active/30",
  inactive: "bg-client-status-inactive/15 text-client-status-inactive border-client-status-inactive/30",
};

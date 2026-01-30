export const TASK_STATUSES = [
  { id: "todo", label: "To Do", color: "bg-slate-500" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { id: "in_review", label: "In Review", color: "bg-amber-500" },
  { id: "testing", label: "Testing", color: "bg-purple-500" },
  { id: "done", label: "Done", color: "bg-emerald-500" },
] as const;

export const TASK_PRIORITIES = [
  { id: "low", label: "Low", color: "bg-slate-400" },
  { id: "medium", label: "Medium", color: "bg-blue-500" },
  { id: "high", label: "High", color: "bg-orange-500" },
  { id: "urgent", label: "Urgent", color: "bg-red-500" },
] as const;

export const ROLES = [
  { id: "admin", label: "Admin", description: "Full access to organization" },
  { id: "team_lead", label: "Team Lead", description: "Manage projects and team" },
  { id: "member", label: "Member", description: "View and work on tasks" },
] as const;

export type TaskStatus = typeof TASK_STATUSES[number]["id"];
export type TaskPriority = typeof TASK_PRIORITIES[number]["id"];
export type Role = typeof ROLES[number]["id"];

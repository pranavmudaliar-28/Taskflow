import {
  Circle,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  AlertTriangle
} from "lucide-react";

export const TASK_STATUSES = [
  { id: "todo", label: "To Do", color: "bg-slate-500", icon: Circle },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500", icon: Clock },
  { id: "in_review", label: "In Review", color: "bg-amber-500", icon: Search },
  { id: "testing", label: "Testing", color: "bg-purple-500", icon: AlertCircle },
  { id: "done", label: "Done", color: "bg-emerald-500", icon: CheckCircle2 },
] as const;

export const TASK_PRIORITIES = [
  { id: "low", label: "Low", color: "bg-slate-400", icon: ArrowDown },
  { id: "medium", label: "Medium", color: "bg-blue-500", icon: ArrowRight },
  { id: "high", label: "High", color: "bg-orange-500", icon: ArrowUp },
  { id: "urgent", label: "Urgent", color: "bg-red-500", icon: AlertTriangle },
] as const;

export const ROLES = [
  { id: "admin", label: "Admin", description: "Full access to organization" },
  { id: "team_lead", label: "Team Lead", description: "Manage projects and team" },
  { id: "member", label: "Member", description: "View and work on tasks" },
] as const;

export type TaskStatus = typeof TASK_STATUSES[number]["id"];
export type TaskPriority = typeof TASK_PRIORITIES[number]["id"];
export type Role = typeof ROLES[number]["id"];

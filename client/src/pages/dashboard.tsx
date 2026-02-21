import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Clock, AlertCircle, BarChart3,
  FolderKanban, TrendingUp, ArrowRight, Plus, Calendar,
  ListTodo, Activity, Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import type { Task, Project, TimeLog } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalTimeLogged: number;
  projectCount: number;
}

const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  todo: { label: "To Do", cls: "bg-slate-50 text-slate-500 border-slate-100", dot: "bg-slate-300" },
  in_progress: { label: "In Progress", cls: "bg-blue-50/50 text-blue-600 border-blue-100/50", dot: "bg-blue-500" },
  in_review: { label: "In Review", cls: "bg-violet-50/50 text-violet-600 border-violet-100/50", dot: "bg-violet-500" },
  testing: { label: "Testing", cls: "bg-amber-50/50 text-amber-600 border-amber-100/50", dot: "bg-amber-500" },
  done: { label: "Done", cls: "bg-emerald-50/50 text-emerald-600 border-emerald-100/50", dot: "bg-emerald-500" },
};

const priorityConfig: Record<string, { cls: string }> = {
  low: { cls: "bg-slate-50 text-slate-500 border-slate-100" },
  medium: { cls: "bg-blue-50/50 text-blue-500 border-blue-100/50" },
  high: { cls: "bg-orange-50/50 text-orange-600 border-orange-100/50" },
  urgent: { cls: "bg-red-50/50 text-red-600 border-red-100/50" },
};

const projectColors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-cyan-500"];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({ queryKey: ["/api/dashboard/stats"] });
  const { data: recentTasks, isLoading: tasksLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks/recent"] });
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: timeLogs, isLoading: timeLogsLoading } = useQuery<TimeLog[]>({ queryKey: ["/api/timelogs/recent"] });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const completionRate = stats && stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const kpiCards = [
    {
      label: "Total Tasks",
      value: stats?.totalTasks ?? 0,
      sub: `${stats?.projectCount ?? 0} active projects`,
      icon: ListTodo,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      accent: "border-l-4 border-l-blue-500",
    },
    {
      label: "Completed",
      value: stats?.completedTasks ?? 0,
      sub: `${completionRate}% completion rate`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      accent: "border-l-4 border-l-emerald-500",
    },
    {
      label: "In Progress",
      value: stats?.inProgressTasks ?? 0,
      sub: "Active right now",
      icon: Activity,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
      accent: "border-l-4 border-l-violet-500",
    },
    {
      label: "Overdue",
      value: stats?.overdueTasks ?? 0,
      sub: "Need attention",
      icon: AlertCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      accent: "border-l-4 border-l-red-500",
    },
  ];

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      {/* ── Page header ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#020617] tracking-tight">
              {greeting}, {user?.firstName || "there"}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">
              Here's what's happening with your work today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        {/* Completion progress bar */}
        {!statsLoading && stats && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 shrink-0 font-medium">{completionRate}% complete</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map(({ label, value, sub, icon: Icon, iconBg, iconColor, accent }) => (
            <div key={label} className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm p-6 transition-all hover:shadow-md", accent)}>
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ) : (
                <>
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center mb-3", iconBg)}>
                    <Icon className={cn("h-4.5 w-4.5", iconColor)} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
                  <p className="text-xs text-slate-400 mt-1">{sub}</p>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Recent Tasks ── */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <div>
                <h2 className="text-base font-bold text-[#020617]">Recent Tasks</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Your latest task activity</p>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 h-8 text-xs gap-1">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div className="divide-y divide-slate-50">
              {tasksLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              ) : recentTasks && recentTasks.length > 0 ? (
                recentTasks.slice(0, 8).map((task) => {
                  const sc = statusConfig[task.status] ?? statusConfig.todo;
                  const pc = priorityConfig[task.priority ?? "medium"];
                  const project = projects?.find(p => p.id === task.projectId);
                  const projectSlug = project?.slug || project?.id || task.projectId;
                  const taskPath = task.parentId
                    ? `${task.parentId}/${task.slug || task.id}`
                    : `${task.slug || task.id}`;
                  return (
                    <Link key={task.id} href={`/projects/${projectSlug}/${taskPath}`}>
                      <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer group">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", sc.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.priority && (
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize", pc.cls)}>
                              {task.priority}
                            </span>
                          )}
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", sc.cls)}>
                            {sc.label}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <ListTodo className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No recent tasks</p>
                  <p className="text-xs text-slate-400 mt-1">Tasks will appear here as you create them</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">
            {/* Active Projects */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                <h2 className="text-sm font-semibold text-slate-900">Active Projects</h2>
                <Link href="/tasks">
                  <button className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 font-medium">
                    All <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
              </div>
              <div className="px-5 py-3 space-y-3">
                {projectsLoading ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                ) : projects && projects.length > 0 ? (
                  projects.slice(0, 5).map((project, i) => (
                    <Link key={project.id} href={`/projects/${project.slug || project.id}`}>
                      <div className="flex items-center gap-3 py-2 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0", projectColors[i % projectColors.length])}>
                          {project.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-slate-400 truncate">{project.description}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No projects yet</p>
                )}
              </div>
            </div>

            {/* Time logged */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                <h2 className="text-sm font-semibold text-slate-900">Recent Time Logs</h2>
                <Link href="/time-tracking">
                  <button className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 font-medium">
                    All <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
              </div>
              <div className="px-5 py-3 space-y-2">
                {timeLogsLoading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)
                ) : timeLogs && timeLogs.length > 0 ? (
                  timeLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="flex items-center gap-3 py-1.5">
                      <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">Task #{log.taskId?.slice(0, 8)}</p>
                        <p className="text-[10px] text-slate-400">
                          {log.startTime ? new Date(log.startTime).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 shrink-0">
                        {log.duration ? formatDuration(log.duration) : "running"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No time logs yet</p>
                )}
              </div>

              {stats?.totalTimeLogged != null && stats.totalTimeLogged > 0 && (
                <div className="mx-5 mb-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-700">Total logged</p>
                    <p className="text-sm font-bold text-blue-900">{formatDuration(stats.totalTimeLogged)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

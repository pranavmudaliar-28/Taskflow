import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, CheckCircle2, Clock, TrendingUp, FolderKanban, Activity, AlertTriangle,
} from "lucide-react";
import type { Task, Project, TimeLog } from "@shared/schema";
import { TASK_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalTimeLogged: number;
  projectCount: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
}

const statusColors: Record<string, string> = {
  todo: "bg-muted-foreground",
  in_progress: "bg-primary",
  in_review: "bg-primary/80",
  testing: "bg-warning",
  done: "bg-success",
};

const projectColors = ["bg-primary", "bg-primary/80", "bg-success", "bg-warning", "bg-red-500", "bg-cyan-500"];

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useQuery<AnalyticsData>({ queryKey: ["/api/dashboard/stats"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: tasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: timeLogs } = useQuery<TimeLog[]>({ queryKey: ["/api/timelogs"] });

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const completionRate = stats && stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  const tasksByProject = projects?.map((p, i) => {
    const pt = tasks?.filter((t) => t.projectId === p.id) || [];
    const done = pt.filter((t) => t.status === "done").length;
    return { name: p.name, total: pt.length, done, pct: pt.length > 0 ? Math.round((done / pt.length) * 100) : 0, color: projectColors[i % projectColors.length] };
  }) || [];

  const statusCounts = TASK_STATUSES.map((s) => ({
    ...s,
    count: tasks?.filter((t) => t.status === s.id).length || 0,
    dot: statusColors[s.id] || "bg-muted-foreground",
  }));

  const kpis = [
    { label: "Total Tasks", value: stats?.totalTasks ?? 0, icon: BarChart3, iconBg: "bg-primary/10", iconColor: "text-primary", accent: "border-l-primary" },
    { label: "Completed", value: stats?.completedTasks ?? 0, icon: CheckCircle2, iconBg: "bg-success/10", iconColor: "text-success", accent: "border-l-success" },
    { label: "Active Projects", value: stats?.projectCount ?? 0, icon: FolderKanban, iconBg: "bg-primary/10", iconColor: "text-primary/80", accent: "border-l-primary/80" },
    { label: "Time Tracked", value: stats?.totalTimeLogged ? formatDuration(stats.totalTimeLogged) : "0m", icon: Clock, iconBg: "bg-warning/10", iconColor: "text-warning", accent: "border-l-warning" },
  ];

  return (
    <div className="flex flex-col min-h-full bg-background/50">
      {/* ── Page header ── */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border px-6 py-5 sticky top-0 z-20">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your team's productivity and progress</p>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, icon: Icon, iconBg, iconColor, accent }) => (
            <div key={label} className={cn("bg-card rounded-xl border border-border shadow-sm p-5 border-l-4", accent)}>
              {statsLoading ? (
                <div className="space-y-2"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="h-7 w-16" /><Skeleton className="h-3 w-20" /></div>
              ) : (
                <>
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center mb-3", iconBg)}>
                    <Icon className={cn("h-4.5 w-4.5", iconColor)} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</p>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Status distribution */}
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground">Task Status Distribution</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              {statusCounts.map((s) => {
                const pct = tasks && tasks.length > 0 ? Math.round((s.count / tasks.length) * 100) : 0;
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
                        <span className="text-foreground/80 font-medium">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{s.count}</span>
                        <span className="text-muted-foreground/60 text-xs">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", s.dot)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Projects progress */}
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground">Projects Progress</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              {tasksByProject.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <FolderKanban className="h-10 w-10 text-muted mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No projects yet</p>
                </div>
              ) : tasksByProject.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2.5 w-2.5 rounded-full", p.color)} />
                      <span className="text-foreground/80 font-medium truncate max-w-36">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground text-xs">{p.done}/{p.total}</span>
                      <span className="text-xs font-semibold text-foreground/70 min-w-8 text-right">{p.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", p.color)} style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Productivity insights */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Productivity Insights
            </h2>
          </div>
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/50">
            {[
              {
                label: "Completed This Week",
                icon: CheckCircle2,
                iconBg: "bg-success/10",
                iconColor: "text-success",
                value: tasks?.filter((t) => {
                  if (t.status !== "done" || !t.updatedAt) return false;
                  const w = new Date(); w.setDate(w.getDate() - 7);
                  return new Date(t.updatedAt) >= w;
                }).length ?? 0,
              },
              {
                label: "Avg. Session Duration",
                icon: Clock,
                iconBg: "bg-primary/10",
                iconColor: "text-primary",
                value: timeLogs && timeLogs.length > 0
                  ? formatDuration(Math.round(timeLogs.reduce((a, l) => a + (l.duration || 0), 0) / timeLogs.length))
                  : "N/A",
              },
              {
                label: "Overdue Tasks",
                icon: AlertTriangle,
                iconBg: "bg-destructive/10",
                iconColor: "text-destructive",
                value: tasks?.filter((t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date()).length ?? 0,
              },
            ].map(({ label, icon: Icon, iconBg, iconColor, value }) => (
              <div key={label} className="flex items-center gap-4 px-5 py-5">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
                  <Icon className={cn("h-5 w-5", iconColor)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

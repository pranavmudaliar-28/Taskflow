import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  FolderKanban,
  TrendingUp,
  Users,
  ArrowRight,
  Plus,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { TASK_STATUSES } from "@/lib/constants";
import type { Task, Project, TimeLog } from "@shared/schema";

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalTimeLogged: number;
  projectCount: number;
}

const statCards = (stats: DashboardStats | undefined, isLoading: boolean, formatDuration: (s: number) => string) => [
  {
    label: "Total Tasks",
    value: isLoading ? null : stats?.totalTasks ?? 0,
    icon: BarChart3,
    color: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-950/50",
    border: "border-l-violet-500",
    trend: stats?.totalTasks ? `${stats.projectCount} projects` : null,
    trendColor: "text-violet-500",
  },
  {
    label: "Completed",
    value: isLoading ? null : stats?.completedTasks ?? 0,
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
    border: "border-l-emerald-500",
    trend: stats && stats.totalTasks > 0
      ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}% rate`
      : null,
    trendColor: "text-emerald-500",
  },
  {
    label: "In Progress",
    value: isLoading ? null : stats?.inProgressTasks ?? 0,
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950/50",
    border: "border-l-blue-500",
    trend: stats?.overdueTasks ? `${stats.overdueTasks} overdue` : "On track",
    trendColor: stats?.overdueTasks ? "text-red-500" : "text-blue-500",
  },
  {
    label: "Time Logged",
    value: isLoading ? null : formatDuration(stats?.totalTimeLogged ?? 0),
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950/50",
    border: "border-l-amber-500",
    trend: "This week",
    trendColor: "text-amber-500",
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/recent"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: timeLogs, isLoading: timeLogsLoading } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs/recent"],
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusLabel = (status: string) =>
    TASK_STATUSES.find((s) => s.id === status)?.label || status;

  const getStatusClass = (status: string) =>
    `status-${status.replace("_", "-")}`;

  const getPriorityClass = (priority: string) => `priority-${priority}`;

  const cards = statCards(stats, statsLoading, formatDuration);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="p-5 sm:p-6 space-y-5 max-w-screen-xl">
      {/* ── Welcome Banner ── */}
      <div
        className="rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{ background: "linear-gradient(135deg, hsl(262 65% 52%), hsl(278 62% 56%))" }}
      >
        <div className="text-white">
          <p className="text-violet-200 text-xs font-medium mb-0.5">{greeting} 👋</p>
          <h1 className="text-lg font-bold leading-tight" data-testid="text-welcome">
            {user?.firstName ? `Welcome back, ${user.firstName}!` : "Welcome back!"}
          </h1>
          <p className="text-violet-200/80 text-xs mt-0.5">Here's an overview of your projects today.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/tasks">
            <Button size="sm" className="h-7 text-xs bg-white/15 hover:bg-white/25 text-white border-white/20 border" variant="outline">
              <Plus className="h-3 w-3 mr-1" />
              New Task
            </Button>
          </Link>
          <Link href="/analytics">
            <Button size="sm" className="h-7 text-xs bg-white text-violet-700 hover:bg-violet-50 font-semibold">
              <BarChart3 className="h-3 w-3 mr-1" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <Card key={i} className={`border-l-4 ${card.border} hover:shadow-sm transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{card.label}</p>
                  {card.value === null ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold tracking-tight" data-testid={`text-${card.label.toLowerCase().replace(/ /g, "-")}`}>
                      {card.value}
                    </p>
                  )}
                  {card.trend && (
                    <p className={`text-[11px] mt-1 font-medium ${card.trendColor}`}>{card.trend}</p>
                  )}
                </div>
                <div className={`h-8 w-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent Tasks */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Tasks</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Your latest activity</p>
            </div>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 text-xs" data-testid="link-view-all-tasks">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-2.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentTasks && recentTasks.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-1.5">
                  {recentTasks.map((task) => {
                    const statusConfig = TASK_STATUSES.find((s) => s.id === task.status);
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
                        data-testid={`task-item-${task.id}`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${task.status === "done" ? "bg-emerald-100 dark:bg-emerald-950" :
                          task.status === "in_progress" ? "bg-blue-100 dark:bg-blue-950" :
                            "bg-muted"
                          }`}>
                          <div className={`h-2 w-2 rounded-full ${statusConfig?.color || "bg-slate-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getStatusClass(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getPriorityClass(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <AlertCircle className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Create a project to start adding tasks</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Projects</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{projects?.length ?? 0} active</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
              <FolderKanban className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : projects && projects.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {projects.map((project, i) => {
                    const colors = [
                      "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500",
                    ];
                    return (
                      <Link key={project.id} href={`/projects/${project.id}`} data-testid={`project-link-${project.id}`}>
                        <div className="p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group border border-transparent hover:border-border">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-lg ${colors[i % colors.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                              {project.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                {project.name}
                              </p>
                              {project.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-violet-500 transition-colors shrink-0" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <FolderKanban className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Create your first project to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Time Logs ── */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Recent Time Logs</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Your tracked work sessions</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
        </CardHeader>
        <CardContent>
          {timeLogsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : timeLogs && timeLogs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {timeLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
                  data-testid={`timelog-${log.id}`}
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {log.duration ? formatDuration(log.duration) : "In progress"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  {log.approved && (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                      Approved
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[100px] text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No time logged yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

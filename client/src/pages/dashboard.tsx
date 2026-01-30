import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BarChart3,
  FolderKanban,
  TrendingUp,
  Users
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
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusLabel = (status: string) => {
    return TASK_STATUSES.find(s => s.id === status)?.label || status;
  };

  const getStatusClass = (status: string) => {
    return `status-${status.replace("_", "-")}`;
  };

  const getPriorityClass = (priority: string) => {
    return `priority-${priority}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold" data-testid="text-welcome">
          Welcome back, {user?.firstName || "there"}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-tasks">
                {stats?.totalTasks || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-bold" data-testid="text-completed-tasks">
                  {stats?.completedTasks || 0}
                </div>
                {stats && stats.totalTasks > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round((stats.completedTasks / stats.totalTasks) * 100)}% completion rate
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-in-progress-tasks">
                {stats?.inProgressTasks || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time Logged
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-time-logged">
                {stats?.totalTimeLogged ? formatDuration(stats.totalTimeLogged) : "0m"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Recent Tasks</CardTitle>
            <Link 
              href="/dashboard" 
              className="text-sm text-primary hover:underline"
              data-testid="link-view-all-tasks"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentTasks && recentTasks.length > 0 ? (
              <ScrollArea className="h-[320px]">
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-md hover-elevate bg-muted/30 cursor-pointer"
                      data-testid={`task-item-${task.id}`}
                    >
                      <div className={`h-2 w-2 rounded-full mt-2 ${TASK_STATUSES.find(s => s.id === task.status)?.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={`text-xs ${getStatusClass(task.status)}`}>
                            {getStatusLabel(task.status)}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${getPriorityClass(task.priority)}`}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No tasks yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Create a project to start adding tasks
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <ScrollArea className="h-[320px]">
                <div className="space-y-2">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      data-testid={`project-link-${project.id}`}
                    >
                      <div className="p-3 rounded-md hover-elevate bg-muted/30 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <FolderKanban className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{project.name}</p>
                            {project.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <FolderKanban className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No projects yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Create your first project to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Recent Time Logs</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {timeLogsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : timeLogs && timeLogs.length > 0 ? (
            <div className="space-y-3">
              {timeLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                  data-testid={`timelog-${log.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {log.duration ? formatDuration(log.duration) : "In progress"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.startTime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {log.approved && (
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Approved
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[120px] text-center">
              <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No time logged yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

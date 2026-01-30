import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users,
  FolderKanban
} from "lucide-react";
import type { Task, Project, TimeLog } from "@shared/schema";
import { TASK_STATUSES } from "@/lib/constants";

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

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: timeLogs } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs"],
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const completionRate = stats && stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  const tasksByProject = projects?.map((project) => {
    const projectTasks = tasks?.filter((t) => t.projectId === project.id) || [];
    const completed = projectTasks.filter((t) => t.status === "done").length;
    return {
      name: project.name,
      total: projectTasks.length,
      completed,
      progress: projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0,
    };
  }) || [];

  const statusCounts = TASK_STATUSES.map((status) => ({
    ...status,
    count: tasks?.filter((t) => t.status === status.id).length || 0,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">Track your team's productivity and progress</p>
      </div>

      {/* Key Metrics */}
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
              <div className="text-2xl font-bold" data-testid="stat-total-tasks">
                {stats?.totalTasks || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold" data-testid="stat-completion-rate">
                  {completionRate}%
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="stat-projects">
                {stats?.projectCount || projects?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time Tracked
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="stat-time-tracked">
                {stats?.totalTimeLogged ? formatDuration(stats.totalTimeLogged) : "0m"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusCounts.map((status) => (
                <div key={status.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${status.color}`} />
                      <span>{status.label}</span>
                    </div>
                    <span className="font-medium">{status.count}</span>
                  </div>
                  <Progress 
                    value={tasks && tasks.length > 0 ? (status.count / tasks.length) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Projects Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Projects Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksByProject.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No projects yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasksByProject.map((project, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate flex-1 mr-4">{project.name}</span>
                      <span className="text-muted-foreground shrink-0">
                        {project.completed}/{project.total} tasks
                      </span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Productivity Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Productivity Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2 p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Tasks Completed This Week</p>
              <p className="text-3xl font-bold">
                {tasks?.filter((t) => {
                  if (t.status !== "done" || !t.updatedAt) return false;
                  const updated = new Date(t.updatedAt);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return updated >= weekAgo;
                }).length || 0}
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Average Task Completion Time</p>
              <p className="text-3xl font-bold">
                {timeLogs && timeLogs.length > 0 
                  ? formatDuration(
                      Math.round(
                        timeLogs.reduce((acc, log) => acc + (log.duration || 0), 0) / timeLogs.length
                      )
                    )
                  : "N/A"}
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Overdue Tasks</p>
              <p className="text-3xl font-bold text-destructive">
                {tasks?.filter((t) => {
                  if (t.status === "done" || !t.dueDate) return false;
                  return new Date(t.dueDate) < new Date();
                }).length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

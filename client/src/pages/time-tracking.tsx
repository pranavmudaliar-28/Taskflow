import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Clock, 
  Play, 
  Square, 
  Calendar,
  BarChart3
} from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import type { TimeLog, Task, Project } from "@shared/schema";

export default function TimeTracking() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [elapsedTime, setElapsedTime] = useState(0);

  const { data: timeLogs, isLoading: logsLoading } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: activeLog } = useQuery<TimeLog | null>({
    queryKey: ["/api/timelogs/active"],
    refetchInterval: 5000,
  });

  const isTimerActive = activeLog && !activeLog.endTime;

  useEffect(() => {
    if (isTimerActive && activeLog) {
      const interval = setInterval(() => {
        const start = new Date(activeLog.startTime);
        setElapsedTime(differenceInSeconds(new Date(), start));
      }, 1000);
      return () => clearInterval(interval);
    }
    setElapsedTime(0);
  }, [isTimerActive, activeLog]);

  const startTimerMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", "/api/timelogs/start", { taskId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs/active"] });
      toast({ title: "Timer started" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Failed to start timer", variant: "destructive" });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timelogs/stop");
      return await res.json();
    },
    onSuccess: () => {
      setElapsedTime(0);
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs/active"] });
      toast({ title: "Timer stopped" });
    },
    onError: () => {
      toast({ title: "Failed to stop timer", variant: "destructive" });
    },
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDurationShort = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTaskName = (taskId: string) => {
    return tasks?.find((t) => t.id === taskId)?.title || "Unknown Task";
  };

  const getProjectName = (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (!task) return "Unknown Project";
    return projects?.find((p) => p.id === task.projectId)?.name || "Unknown Project";
  };

  const totalTimeToday = timeLogs?.reduce((acc, log) => {
    if (!log.duration) return acc;
    const logDate = new Date(log.startTime);
    const today = new Date();
    if (logDate.toDateString() === today.toDateString()) {
      return acc + log.duration;
    }
    return acc;
  }, 0) || 0;

  const totalTimeWeek = timeLogs?.reduce((acc, log) => {
    if (!log.duration) return acc;
    const logDate = new Date(log.startTime);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (logDate >= weekAgo) {
      return acc + log.duration;
    }
    return acc;
  }, 0) || 0;

  const activeTasks = tasks?.filter((t) => t.status !== "done") || [];

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Time Tracking</h1>
        <p className="text-muted-foreground">Track time spent on your tasks</p>
      </div>

      <Card className={isTimerActive ? "ring-2 ring-primary" : ""}>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle className="text-lg">Active Timer</CardTitle>
          {isTimerActive && (
            <Badge className="bg-emerald-500 text-white no-default-hover-elevate no-default-active-elevate">Recording</Badge>
          )}
        </CardHeader>
        <CardContent>
          {isTimerActive && activeLog ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-5xl font-mono font-bold text-primary" data-testid="text-active-timer">
                  {formatDuration(elapsedTime)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Working on: {getTaskName(activeLog.taskId)}
                </p>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => stopTimerMutation.mutate()}
                disabled={stopTimerMutation.isPending}
                data-testid="button-stop-active-timer"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Timer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No active timer</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start timer for task:</label>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(taskId) => startTimerMutation.mutate(taskId)}
                    disabled={startTimerMutation.isPending}
                  >
                    <SelectTrigger data-testid="select-task-for-timer" className="flex-1">
                      <SelectValue placeholder="Select a task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTasks.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No active tasks
                        </div>
                      ) : (
                        activeTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            <div className="flex items-center gap-2">
                              <Play className="h-3 w-3 text-muted-foreground" />
                              {task.title}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-time-today">
              {formatDurationShort(totalTimeToday + (isTimerActive ? elapsedTime : 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-time-week">
              {formatDurationShort(totalTimeWeek + (isTimerActive ? elapsedTime : 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">Recent Time Logs</CardTitle>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : timeLogs && timeLogs.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {timeLogs
                  .filter((log) => {
                    if (selectedProject === "all") return true;
                    const task = tasks?.find((t) => t.id === log.taskId);
                    return task?.projectId === selectedProject;
                  })
                  .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                  .map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-4 p-4 rounded-md bg-muted/30"
                      data-testid={`timelog-item-${log.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{getTaskName(log.taskId)}</p>
                          <p className="text-sm text-muted-foreground">
                            {getProjectName(log.taskId)} {"\u00B7"} {format(new Date(log.startTime), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {log.duration ? formatDurationShort(log.duration) : "In progress"}
                        </p>
                        <div className="flex items-center gap-2 justify-end mt-1">
                          {log.approved && (
                            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              Approved
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No time logs yet</p>
              <p className="text-sm text-muted-foreground/70">Start a timer to begin tracking</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

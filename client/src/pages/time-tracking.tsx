import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, Play, Square, Calendar, BarChart3, Timer } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import type { TimeLog, Task, Project } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function TimeTracking() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const { data: timeLogs, isLoading: logsLoading } = useQuery<TimeLog[]>({ queryKey: ["/api/timelogs"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: tasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: activeLogs = [] } = useQuery<TimeLog[]>({ queryKey: ["/api/timelogs/active"], refetchInterval: 5000 });

  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (activeLogs.length > 0) {
      const interval = setInterval(() => {
        const times: Record<string, number> = {};
        activeLogs.forEach((log) => {
          times[log.taskId] = differenceInSeconds(new Date(), new Date(log.startTime));
        });
        setElapsedTimes(times);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTimes({});
    }
  }, [activeLogs]);

  const startTimerMutation = useMutation({
    mutationFn: async (taskId: string) => (await apiRequest("POST", "/api/timelogs/start", { taskId })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs/active"] });
      toast({ title: "Timer started" });
    },
    onError: (e: any) => toast({ title: e?.message || "Failed to start timer", variant: "destructive" }),
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (taskId: string) => (await apiRequest("POST", "/api/timelogs/stop", { taskId })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs/active"] });
      toast({ title: "Timer stopped" });
    },
    onError: () => toast({ title: "Failed to stop timer", variant: "destructive" }),
  });

  const fmtHMS = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const fmtShort = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };

  const getTaskName = (id: string) => tasks?.find((t) => t.id === id)?.title || "Unknown Task";
  const getProjectName = (id: string) => { const t = tasks?.find((t) => t.id === id); return projects?.find((p) => p.id === t?.projectId)?.name || ""; };

  const totalToday = timeLogs?.reduce((a, l) => l.duration && new Date(l.startTime).toDateString() === new Date().toDateString() ? a + l.duration : a, 0) || 0;
  const totalWeek = timeLogs?.reduce((a, l) => { const w = new Date(); w.setDate(w.getDate() - 7); return l.duration && new Date(l.startTime) >= w ? a + l.duration : a; }, 0) || 0;
  const totalActive = Object.values(elapsedTimes).reduce((a, v) => a + v, 0);

  const availTasks = tasks?.filter((t) => t.status !== "done" && !(activeLogs as TimeLog[]).some((l) => l.taskId === t.id)) || [];

  const filteredLogs = timeLogs
    ?.filter((l) => selectedProject === "all" || tasks?.find((t) => t.id === l.taskId)?.projectId === selectedProject)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) || [];

  return (
    <div className="flex flex-col min-h-full bg-background text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-foreground">Time Tracking</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track time spent on your tasks</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Today", value: fmtShort(totalToday + totalActive), icon: Calendar, iconBg: "bg-blue-500/10", iconColor: "text-blue-500", testId: "text-time-today" },
            { label: "This Week", value: fmtShort(totalWeek + totalActive), icon: BarChart3, iconBg: "bg-violet-500/10", iconColor: "text-violet-500", testId: "text-time-week" },
            { label: "Active Timers", value: activeLogs.length, icon: Timer, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
          ].map(({ label, value, icon: Icon, iconBg, iconColor, testId }) => (
            <div key={label} className="bg-card rounded-xl border border-border shadow-sm p-5">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center mb-3", iconBg)}>
                <Icon className={cn("h-4.5 w-4.5", iconColor)} />
              </div>
              <p className="text-2xl font-bold text-foreground" data-testid={testId}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Active timers */}
        <div className={cn("bg-card rounded-xl border shadow-sm", activeLogs.length > 0 ? "border-primary/50 ring-1 ring-primary/20" : "border-border")}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Active Timers</h2>
            {activeLogs.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeLogs.length} Recording
              </span>
            )}
          </div>
          <div className="px-5 py-4">
            {activeLogs.length > 0 ? (
              <div className="space-y-3">
                {activeLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-4 bg-primary/5 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{getTaskName(log.taskId)}</p>
                      <p className="text-2xl font-mono font-bold text-primary mt-1">{fmtHMS(elapsedTimes[log.taskId] || 0)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => stopTimerMutation.mutate(log.taskId)}
                      disabled={stopTimerMutation.isPending}
                      className="gap-2"
                    >
                      <Square className="h-3.5 w-3.5" /> Stop
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No active timer</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Start timer for task:</label>
                  <Select onValueChange={(id) => startTimerMutation.mutate(id)} disabled={startTimerMutation.isPending}>
                    <SelectTrigger data-testid="select-task-for-timer" className="h-10 border-border rounded-lg">
                      <SelectValue placeholder="Select a task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availTasks.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No active tasks</div>
                      ) : availTasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <Play className="h-3 w-3 text-muted-foreground" />
                            {t.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logs table */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Time Log History</h2>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-44 h-8 border-border rounded-lg text-xs">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {logsLoading ? (
            <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : filteredLogs.length > 0 ? (
            <ScrollArea className="h-[420px]">
              <div className="divide-y divide-border/50">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors" data-testid={`timelog-item-${log.id}`}>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{getTaskName(log.taskId)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getProjectName(log.taskId)} {getProjectName(log.taskId) && "·"} {format(new Date(log.startTime), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{log.duration ? fmtShort(log.duration) : "Running…"}</p>
                      {log.approved && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold px-1.5 py-0.5 rounded-full">Approved</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No time logs yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Start a timer to begin tracking</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

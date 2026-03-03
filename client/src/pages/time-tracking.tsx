import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, Play, Square, Calendar, BarChart3, Timer } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import type { TimeLog, Task, Project } from "@shared/schema";
import { cn } from "@/lib/utils";

/* ── helpers ── */
const fmtHMS = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* Shows seconds for sub-minute durations so we never display 0m */
const fmtShort = (s: number) => {
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* ── live elapsed-time hook ──
   Returns a Record<taskId, seconds> that ticks every second.
   It initialises from log.startTime so it's correct from the
   very first render (no jump from 0).                          */
function useLiveElapsed(activeLogs: TimeLog[]): Record<string, number> {
  const computeNow = () => {
    const times: Record<string, number> = {};
    activeLogs.forEach((log) => {
      if (log.startTime) {
        times[log.taskId] = Math.max(0, differenceInSeconds(new Date(), new Date(log.startTime)));
      }
    });
    return times;
  };

  // Initialise synchronously so first render shows real elapsed time
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>(computeNow);

  // Keep a ref to activeLogs so the interval closure is always fresh
  const logsRef = useRef(activeLogs);
  useEffect(() => { logsRef.current = activeLogs; }, [activeLogs]);

  useEffect(() => {
    if (activeLogs.length === 0) {
      setElapsedTimes({});
      return;
    }
    // Re-compute immediately whenever active logs change (e.g. new timer started)
    setElapsedTimes(computeNow());

    const interval = setInterval(() => {
      const times: Record<string, number> = {};
      logsRef.current.forEach((log) => {
        if (log.startTime) {
          times[log.taskId] = Math.max(0, differenceInSeconds(new Date(), new Date(log.startTime)));
        }
      });
      setElapsedTimes(times);
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLogs]);

  return elapsedTimes;
}

export default function TimeTracking() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("all");

  // Poll completed logs every 10 s so the history updates without a refresh
  const { data: timeLogs, isLoading: logsLoading } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs"],
    refetchInterval: 10_000,
  });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  // Poll tasks every 15 s so the dropdown reflects newly created / completed tasks
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    refetchInterval: 15_000,
  });

  // Active logs polled every 5 s — the source of truth for running timers
  const { data: activeLogs = [] } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs/active"],
    refetchInterval: 5_000,
  });

  const elapsedTimes = useLiveElapsed(activeLogs);

  /* ── mutations ── */
  const startTimerMutation = useMutation({
    mutationFn: async (taskId: string) =>
      (await apiRequest("POST", "/api/timelogs/start", { taskId })).json(),
    onSuccess: async () => {
      // Await the refetch so activeLogs is updated BEFORE the dropdown can reappear
      await queryClient.refetchQueries({ queryKey: ["/api/timelogs/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      toast({ title: "Timer started" });
    },
    onError: (e: any) => toast({ title: e?.message || "Failed to start timer", variant: "destructive" }),
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (taskId: string) =>
      (await apiRequest("POST", "/api/timelogs/stop", { taskId })).json(),
    onSuccess: async () => {
      // Await refetch so the active-timer list clears before UI re-renders
      await queryClient.refetchQueries({ queryKey: ["/api/timelogs/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      toast({ title: "Timer stopped" });
    },
    onError: () => toast({ title: "Failed to stop timer", variant: "destructive" }),
  });

  /* ── derived ── */
  const getTaskName = (id: string) => tasks?.find((t) => t.id === id)?.title || "Unknown Task";
  const getProjectName = (id: string) => {
    const t = tasks?.find((t) => t.id === id);
    return projects?.find((p) => p.id === t?.projectId)?.name || "";
  };

  const totalActive = Object.values(elapsedTimes).reduce((a, v) => a + v, 0);

  const totalToday = timeLogs?.reduce(
    (a, l) =>
      l.duration && new Date(l.startTime).toDateString() === new Date().toDateString()
        ? a + l.duration
        : a,
    0
  ) || 0;

  const totalWeek = timeLogs?.reduce((a, l) => {
    const w = new Date(); w.setDate(w.getDate() - 7);
    return l.duration && new Date(l.startTime) >= w ? a + l.duration : a;
  }, 0) || 0;

  // Only one timer may run at a time — tasks already being tracked are excluded
  const hasActiveTimer = activeLogs.length > 0;
  const availTasks = tasks?.filter(
    (t) => t.status !== "done" && !activeLogs.some((l) => l.taskId === t.id)
  ) || [];

  const filteredLogs = timeLogs
    ?.filter(
      (l) =>
        selectedProject === "all" ||
        tasks?.find((t) => t.id === l.taskId)?.projectId === selectedProject
    )
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) || [];

  /* ── render ── */
  return (
    <div className="flex flex-col min-h-full bg-background text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-foreground">Time Tracking</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track time spent on your tasks</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* ─── Active Timers + Start Timer ─── */}
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
          <div className="px-5 py-4 space-y-4">
            {/* Running timers list */}
            {activeLogs.length > 0 ? (
              <div className="space-y-3">
                {activeLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-4 bg-primary/5 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{getTaskName(log.taskId)}</p>
                      <p className="text-2xl font-mono font-bold text-primary mt-1">
                        {fmtHMS(elapsedTimes[log.taskId] ?? Math.max(0, differenceInSeconds(new Date(), new Date(log.startTime))))}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Started {format(new Date(log.startTime), "h:mm a")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => stopTimerMutation.mutate(log.taskId)}
                      disabled={stopTimerMutation.isPending}
                      className="gap-2 shrink-0"
                    >
                      <Square className="h-3.5 w-3.5" /> Stop
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No active timers</p>
              </div>
            )}

            {/* Start timer — always visible, only hides tasks already being tracked */}
            <div className="border-t border-border/40 pt-4 space-y-2">
              <label className="text-sm font-medium text-foreground">
                {activeLogs.length > 0 ? "Track another task:" : "Start timer for task:"}
              </label>
              <Select
                key={`${availTasks.length}-${activeLogs.length}`}
                onValueChange={(id) => startTimerMutation.mutate(id)}
                disabled={startTimerMutation.isPending || startTimerMutation.isSuccess}
              >
                <SelectTrigger data-testid="select-task-for-timer" className="h-10 border-border rounded-lg">
                  <SelectValue placeholder="Select a task…" />
                </SelectTrigger>
                <SelectContent>
                  {availTasks.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      All tasks are already being tracked
                    </div>
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
                {filteredLogs.map((log) => {
                  // Match by log ID — the active log in DB has no endTime yet
                  const activeMatch = activeLogs.find((a) => a.id === log.id);
                  const isActive = !!activeMatch;
                  const liveSecs = isActive
                    ? (elapsedTimes[log.taskId] ?? Math.max(0, differenceInSeconds(new Date(), new Date(log.startTime))))
                    : null;

                  return (
                    <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors" data-testid={`timelog-item-${log.id}`}>
                      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", isActive ? "bg-emerald-500/10" : "bg-primary/10")}>
                        <Clock className={cn("h-4 w-4", isActive ? "text-emerald-600" : "text-primary")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{getTaskName(log.taskId)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getProjectName(log.taskId)}{getProjectName(log.taskId) && " · "}{format(new Date(log.startTime), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {isActive ? (
                          /* Live ticking display for the running entry in history */
                          <p className="text-sm font-mono font-semibold text-emerald-600">
                            {fmtHMS(liveSecs ?? 0)}
                          </p>
                        ) : (
                          <p className="text-sm font-semibold text-foreground">
                            {log.duration != null ? fmtShort(log.duration) : "—"}
                          </p>
                        )}
                        {log.approved && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold px-1.5 py-0.5 rounded-full">Approved</span>
                        )}
                      </div>
                    </div>
                  );
                })}
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

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, Play, Square, Calendar, BarChart3, Timer } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import type { TimeLog, Task, Project } from "@shared/schema";
import { cn } from "@/lib/utils";

/* ── helpers — UNCHANGED ── */
const fmtHMS = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const fmtShort = (s: number) => {
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* ── live elapsed-time hook — UNCHANGED ── */
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

  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>(computeNow);
  const logsRef = useRef(activeLogs);
  useEffect(() => { logsRef.current = activeLogs; }, [activeLogs]);

  useEffect(() => {
    if (activeLogs.length === 0) { setElapsedTimes({}); return; }
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

/* ════════════════════════════════════════════════
   TIME TRACKING PAGE
════════════════════════════════════════════════ */
export default function TimeTracking() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("all");

  /* ── queries — UNCHANGED ── */
  const { data: timeLogs, isLoading: logsLoading } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs"],
    refetchInterval: 10_000,
  });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    refetchInterval: 15_000,
  });
  const { data: activeLogs = [] } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs/active"],
    refetchInterval: 5_000,
  });

  const elapsedTimes = useLiveElapsed(activeLogs);

  /* ── mutations — UNCHANGED ── */
  const startTimerMutation = useMutation({
    mutationFn: async (taskId: string) =>
      (await apiRequest("POST", "/api/timelogs/start", { taskId })).json(),
    onSuccess: async () => {
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
      await queryClient.refetchQueries({ queryKey: ["/api/timelogs/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      toast({ title: "Timer stopped" });
    },
    onError: () => toast({ title: "Failed to stop timer", variant: "destructive" }),
  });

  /* ── derived — UNCHANGED ── */
  const getTaskName = (id: string) => tasks?.find((t) => t.id === id)?.title || "Unknown Task";
  const getProjectName = (id: string) => {
    const t = tasks?.find((t) => t.id === id);
    return projects?.find((p) => p.id === t?.projectId)?.name || "";
  };

  const totalActive = Object.values(elapsedTimes).reduce((a, v) => a + v, 0);

  const totalToday = timeLogs?.reduce(
    (a, l) =>
      l.duration && new Date(l.startTime).toDateString() === new Date().toDateString()
        ? a + l.duration : a,
    0
  ) || 0;

  const totalWeek = timeLogs?.reduce((a, l) => {
    const w = new Date(); w.setDate(w.getDate() - 7);
    return l.duration && new Date(l.startTime) >= w ? a + l.duration : a;
  }, 0) || 0;

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

  /* ════════════════════════════════
     RENDER
  ════════════════════════════════ */
  return (
    <div className="flex min-h-full w-full flex-col overflow-x-hidden bg-background text-foreground">

      {/* ── Page header ── */}
      <div className="w-full shrink-0 border-b border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Time Tracking</h1>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          Track time spent on your tasks
        </p>
      </div>

      {/* ── Page body ── */}
      <div className="w-full flex-1 space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">

        {/* ═══ STATS — 1 col → 2 col → 3 col ═══ */}
        <div className="grid w-full grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {[
            { label: "Today", value: fmtShort(totalToday + totalActive), icon: Calendar, iconBg: "bg-blue-500/10", iconColor: "text-blue-500", testId: "text-time-today" },
            { label: "This Week", value: fmtShort(totalWeek + totalActive), icon: BarChart3, iconBg: "bg-violet-500/10", iconColor: "text-violet-500", testId: "text-time-week" },
            { label: "Active Timers", value: activeLogs.length, icon: Timer, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
          ].map(({ label, value, icon: Icon, iconBg, iconColor, testId }) => (
            <div key={label} className="w-full rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-lg", iconBg)}>
                <Icon className={cn("h-[18px] w-[18px]", iconColor)} />
              </div>
              <p className="text-2xl font-bold text-foreground" data-testid={testId}>{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* ═══ ACTIVE TIMERS + START TIMER ═══ */}
        <div className={cn(
          "w-full overflow-hidden rounded-xl border bg-card shadow-sm",
          activeLogs.length > 0 ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
        )}>
          {/* header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-3 sm:px-5 sm:py-4">
            <h2 className="text-sm font-semibold text-foreground">Active Timers</h2>
            {activeLogs.length > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {activeLogs.length} Recording
              </span>
            )}
          </div>

          {/* body */}
          <div className="space-y-4 px-4 py-4 sm:px-5">
            {activeLogs.length > 0 ? (
              <div className="space-y-3">
                {activeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-3 rounded-lg bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{getTaskName(log.taskId)}</p>
                      <p className="mt-1 font-mono text-xl font-bold text-primary sm:text-2xl">
                        {fmtHMS(elapsedTimes[log.taskId] ?? Math.max(0, differenceInSeconds(new Date(), new Date(log.startTime))))}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Started {format(new Date(log.startTime), "h:mm a")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => stopTimerMutation.mutate(log.taskId)}
                      disabled={stopTimerMutation.isPending}
                      className="w-full gap-2 sm:w-auto sm:shrink-0"
                    >
                      <Square className="h-3.5 w-3.5 shrink-0" /> Stop
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No active timers</p>
              </div>
            )}

            {/* Start timer */}
            <div className="space-y-2 border-t border-border/40 pt-4">
              <label className="text-sm font-medium text-foreground">
                {activeLogs.length > 0 ? "Track another task:" : "Start timer for task:"}
              </label>
              <Select
                key={`${availTasks.length}-${activeLogs.length}`}
                onValueChange={(id) => startTimerMutation.mutate(id)}
                disabled={startTimerMutation.isPending || startTimerMutation.isSuccess}
              >
                <SelectTrigger data-testid="select-task-for-timer" className="h-10 w-full rounded-lg border-border">
                  <SelectValue placeholder="Select a task…" />
                </SelectTrigger>
                <SelectContent>
                  {availTasks.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      All tasks are already being tracked
                    </div>
                  ) : availTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <Play className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{t.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ═══ TIME LOG HISTORY ═══ */}
        <div className="w-full rounded-xl border border-border bg-card shadow-sm">

          {/* Card header — stacks on mobile, row on sm+ */}
          <div className="flex flex-col gap-2 border-b border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
            <h2 className="text-sm font-semibold text-foreground">Time Log History</h2>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="h-8 w-full rounded-lg border-border text-xs sm:w-44">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Log rows */}
          {logsLoading ? (
            <div className="space-y-3 p-4 sm:p-5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>

          ) : filteredLogs.length > 0 ? (
            /*
              ─────────────────────────────────────────────────────────────
              KEY FIX: replaced <ScrollArea> (which wraps content in an
              overflow:hidden div that clips on mobile) with a plain
              overflow-y-auto div. max-h gives the scrollable window.

              Each row uses CSS grid with 3 FIXED columns:
                [36px icon] [1fr text — truncates] [auto duration — never hidden]

              The duration column is "auto" = it takes exactly as much
              space as its content needs. The middle column absorbs the
              rest and truncates. This makes the timer/duration impossible
              to clip or push off-screen on ANY screen width.
              ─────────────────────────────────────────────────────────────
            */
            <div className="max-h-[420px] overflow-y-auto overscroll-contain divide-y divide-border/50">
              {filteredLogs.map((log) => {
                const activeMatch = activeLogs.find((a) => a.id === log.id);
                const isActive = !!activeMatch;
                const liveSecs = isActive
                  ? (elapsedTimes[log.taskId] ?? Math.max(0, differenceInSeconds(new Date(), new Date(log.startTime))))
                  : null;

                const taskName = getTaskName(log.taskId);
                const projectName = getProjectName(log.taskId);

                return (
                  <div
                    key={log.id}
                    data-testid={`timelog-item-${log.id}`}
                    /*
                      CSS Grid row — 3 columns:
                        col-1 : 36px  (icon, fixed, never shrinks)
                        col-2 : 1fr   (text, takes all leftover space, truncates)
                        col-3 : auto  (duration, fits its content, never squished)

                      gap-x-3 on mobile → gap-x-4 on sm+
                      px-4 on mobile    → px-5 on sm+
                    */
                    className="grid w-full items-center gap-x-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:gap-x-4 sm:px-5 sm:py-3.5"
                    style={{ gridTemplateColumns: "36px 1fr auto" }}
                  >
                    {/* ── Col 1: icon ── */}
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      isActive ? "bg-emerald-500/10" : "bg-primary/10"
                    )}>
                      <Clock className={cn("h-4 w-4", isActive ? "text-emerald-600" : "text-primary")} />
                    </div>

                    {/* ── Col 2: task name + meta
                        min-w-0 + overflow-hidden are BOTH required for
                        truncate to work inside a grid cell              ── */}
                    <div className="min-w-0 overflow-hidden">
                      <p className="truncate text-sm font-medium text-foreground leading-snug">
                        {taskName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {projectName ? `${projectName} · ` : ""}
                        {format(new Date(log.startTime), "MMM d, yyyy")}
                      </p>
                    </div>

                    {/* ── Col 3: duration + badge
                        "auto" column — takes exactly the space it needs.
                        whitespace-nowrap prevents the HH:MM:SS from wrapping.
                        text-xs on mobile keeps it fitting 320 px screens;
                        text-sm on sm+ for normal readability.              ── */}
                    <div className="flex flex-col items-end justify-center gap-0.5">
                      {isActive ? (
                        <span className="whitespace-nowrap font-mono font-semibold tabular-nums text-emerald-600 text-xs sm:text-sm">
                          {fmtHMS(liveSecs ?? 0)}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                          {log.duration != null ? fmtShort(log.duration) : "—"}
                        </span>
                      )}
                      {log.approved && (
                        <span className="whitespace-nowrap rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                          Approved
                        </span>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          ) : (
            <div className="flex flex-col items-center justify-center py-10 sm:py-12">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No time logs yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Start a timer to begin tracking</p>
            </div>
          )}
        </div>

      </div>{/* /page body */}
    </div>
  );
}
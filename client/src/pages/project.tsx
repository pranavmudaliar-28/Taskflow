import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanColumn } from "@/components/kanban-column";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { ProjectMembersDialog } from "@/components/project-members-dialog";
import { ProjectSettingsDialog } from "@/components/project-settings-dialog";
import { CreateMilestoneDialog } from "@/components/create-milestone-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Settings,
  Users,
  Flag,
  Filter,
  X,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Clock,
  User as UserIcon,
  ListTodo,
  AlertCircle,
} from "lucide-react";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { BulkEditDialog } from "@/components/bulk-edit-dialog";
import { type RowSelectionState } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDebounce } from "@/hooks/use-debounce";
import type { Task, Project, Role, TimeLog, Milestone } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { differenceInSeconds } from "date-fns";
import { TaskTable } from "@/components/task-table";
import { MilestoneBoard } from "@/components/milestone-board";
import type { ExpandedState } from "@tanstack/react-table";
import { cn, ensureArray, ensureObject } from "@/lib/utils";

/* ── types & helpers — UNCHANGED ── */
type ProjectMemberWithUser = {
  id: string;
  projectId: string;
  userId: string;
  role: Role;
  addedAt: string | null;
  user: Omit<User, "password">;
};

const initials = (user: any) => {
  if (!user) return "?";
  return (
    `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() ||
    user.username?.charAt(0).toUpperCase() ||
    "?"
  );
};

const priorityIcon = (priority: string) => {
  const p = TASK_PRIORITIES.find((p) => p.id === priority);
  if (!p) return null;
  const Icon = (p as any).icon;
  return <Icon className={cn("h-3.5 w-3.5", p.color)} />;
};

const statusIcon = (status: string) => {
  const s = TASK_STATUSES.find((s) => s.id === status);
  if (!s) return null;
  const Icon = (s as any).icon;
  return <Icon className={cn("h-3.5 w-3.5", s.color)} />;
};

/* ════════════════════════════════════════════════
   PROJECT PAGE
════════════════════════════════════════════════ */
export default function ProjectPage() {
  /* ── All state & logic — UNCHANGED ── */
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateMilestone, setShowCreateMilestone] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<string>("todo");
  const [createTaskMilestone, setCreateTaskMilestone] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<string>("none");
  const [sortBy, setSortBy] = useState<string>("order");
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [creatingSubtaskFor, setCreatingSubtaskFor] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorObj,
  } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    queryFn: async () => {
      if (!id) throw new Error("No project ID");
      const res = await fetch(`/api/projects/${id}`, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json() as Promise<Project>;
    },
    enabled: !!id,
  });

  const queryParams = new URLSearchParams();
  if (project?.id) queryParams.append("projectId", project.id);
  if (debouncedSearch) queryParams.append("search", debouncedSearch);
  if (status !== "all") queryParams.append("status", status);
  if (priority !== "all") queryParams.append("priority", priority);
  queryParams.append("sortBy", sortBy);
  queryParams.append("sortOrder", sortBy === "order" ? "asc" : "desc");
  queryParams.append("limit", "1000");

  const { data: searchResult, isLoading: tasksLoading } = useQuery<{ tasks: Task[]; total: number }>({
    queryKey: ["/api/tasks/search", project?.id, debouncedSearch, status, priority, sortBy],
    queryFn: async () => {
      if (!project?.id) return { tasks: [], total: 0 };
      const res = await fetch(`/api/tasks/search?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!project?.id,
  });

  const tasks = ensureArray(searchResult?.tasks);

  useEffect(() => {
    if (project?.id) {
      console.info(`[ProjectPage] Loaded project: ${project.name} (${project.id})`);
    }
  }, [project?.id, project?.name]);

  const { data: memberData, isLoading: membersLoading } = useQuery<ProjectMemberWithUser[]>({
    queryKey: ["/api/projects", project?.id, "members"],
    enabled: !!project?.id,
  });

  const { data: milestones, isLoading: milestonesLoading } = useQuery<Milestone[]>({
    queryKey: ["/api/projects", project?.id, "milestones"],
    enabled: !!project?.id,
  });

  const stableMilestones = useMemo(() => milestones || [], [milestones]);

  const { data: activeLogs } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs/active"],
    refetchInterval: 5000,
  });

  const { data: timeLogs } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs"],
  });

  useEffect(() => {
    if (activeLogs && activeLogs.length > 0) {
      const interval = setInterval(() => {
        const newElapsedTimes: Record<string, number> = {};
        activeLogs.forEach((log) => {
          const start = new Date(log.startTime);
          newElapsedTimes[log.taskId] = differenceInSeconds(new Date(), start);
        });
        setElapsedTimes(newElapsedTimes);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTimes((prev) => (Object.keys(prev).length === 0 ? prev : {}));
    }
  }, [activeLogs]);

  const taskDurations = useMemo(() => {
    const durations: Record<string, number> = {};
    if (timeLogs) {
      timeLogs.forEach((log) => {
        const duration = log.duration || 0;
        durations[log.taskId] = (durations[log.taskId] || 0) + duration;
      });
    }
    Object.entries(elapsedTimes).forEach(([taskId, elapsed]) => {
      durations[taskId] = (durations[taskId] || 0) + elapsed;
    });
    return durations;
  }, [timeLogs, elapsedTimes]);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, updates),
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tasks/search"] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ["/api/tasks/search"] });
      queryClient.setQueriesData({ queryKey: ["/api/tasks/search"] }, (old: any) => {
        if (!old || !old.tasks) return old;
        return {
          ...old,
          tasks: old.tasks.map((t: Task) => (t.id === taskId ? { ...t, ...updates } : t)),
        };
      });
      return { previousQueries };
    },
    onError: (err, newTodo, context: any) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, queryData]: any) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
      toast({ title: "Failed to update task", variant: "destructive", description: err.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
    },
  });

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
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", "/api/timelogs/stop", { taskId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs/active"] });
      toast({ title: "Timer stopped" });
    },
  });

  const handleToggleTimer = (taskId: string) => {
    const isActive = activeLogs && activeLogs.some((log) => log.taskId === taskId);
    if (isActive) stopTimerMutation.mutate(taskId);
    else startTimerMutation.mutate(taskId);
  };

  const handleReorder = (items: { id: string; order: number }[]) => {
    apiRequest("PATCH", "/api/tasks/reorder", { items }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
    });
  };

  const handleBulkUpdate = (updates: Partial<Task>) => {
    const ids = Object.keys(rowSelection);
    apiRequest("PATCH", "/api/tasks/bulk/update", { ids, updates }).then(() => {
      toast({ title: "Tasks updated" });
      setRowSelection({});
      setIsBulkEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
    });
  };

  const handleBulkDelete = () => {
    const ids = Object.keys(rowSelection);
    if (confirm(`Are you sure you want to delete ${ids.length} tasks?`)) {
      apiRequest("DELETE", "/api/tasks/bulk/delete", { ids }).then(() => {
        toast({ title: "Tasks deleted" });
        setRowSelection({});
        queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
      });
    }
  };

  const usersMap = useMemo(() => {
    const map = new Map<string, User>();
    memberData?.forEach((m) => {
      if (m.user) map.set(m.userId, m.user as User);
    });
    return map;
  }, [memberData]);

  const projectProgress = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === "done").length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  const getTaskUrl = useCallback(
    (task: Task) => {
      const projectSlug = project?.slug || project?.id || id;
      if (task.parentId) {
        const parent = tasks.find((t) => t.id === task.parentId);
        const parentSlug = parent?.slug || parent?.id || task.parentId;
        return `/projects/${projectSlug}/${parentSlug}/${task.slug || task.id}`;
      }
      return `/projects/${projectSlug}/${task.slug || task.id}`;
    },
    [project?.slug, project?.id, id, tasks]
  );

  const handleTaskClick = useCallback(
    (t: Task) => setLocation(getTaskUrl(t)),
    [setLocation, getTaskUrl]
  );
  const { mutate: updateTask } = updateTaskMutation;
  const handleTaskUpdate = useCallback(
    (taskId: string, up: Partial<Task>) => updateTask({ taskId, updates: up }),
    [updateTask]
  );
  const handleCreateSubtask = useCallback(
    (taskId: string) => setCreatingSubtaskFor(taskId),
    []
  );

  const buildTaskTree = (flatTasks: Task[]) => {
    const taskMap = new Map<string, Task & { subRows?: Task[] }>();
    const roots: (Task & { subRows?: Task[] })[] = [];
    flatTasks.forEach((task) => taskMap.set(task.id, { ...task, subRows: [] }));
    flatTasks.forEach((task) => {
      const node = taskMap.get(task.id)!;
      if (task.parentId && taskMap.has(task.parentId)) {
        const parent = taskMap.get(task.parentId)!;
        parent.subRows = parent.subRows || [];
        parent.subRows.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const groupedTasks = useMemo(() => {
    if (groupBy === "none") return { Tasks: buildTaskTree(tasks) };
    const groups: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      let key = "Other";
      if (groupBy === "status")
        key = TASK_STATUSES.find((s) => s.id === task.status)?.label || "Unknown";
      else if (groupBy === "priority")
        key = TASK_PRIORITIES.find((p) => p.id === task.priority)?.label || "Unknown";
      else if (groupBy === "assignee") {
        const user = task.assigneeId ? usersMap.get(task.assigneeId) : null;
        key = user ? `${user.firstName} ${user.lastName}` : "Unassigned";
      } else if (groupBy === "milestone")
        key = milestones?.find((m) => m.id === task.milestoneId)?.title || "No Milestone";
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return groups;
  }, [tasks, groupBy, usersMap, milestones]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    updateTaskMutation.mutate({
      taskId: result.draggableId,
      updates: { status: newStatus as any },
    });
  };

  const handleMilestoneDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newId =
      result.destination.droppableId === "no-milestone"
        ? null
        : result.destination.droppableId;
    updateTaskMutation.mutate({
      taskId: result.draggableId,
      updates: { milestoneId: newId },
    });
  };

  /* ── Loading ── */
  if (projectLoading) {
    return (
      <div className="w-full overflow-x-hidden space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-48 sm:w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 sm:w-24" />
            <Skeleton className="h-9 w-20 sm:w-24" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl sm:h-[500px]" />
      </div>
    );
  }

  /* ── Error ── */
  if (projectError) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Failed to load project</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {projectErrorObj instanceof Error
          ? projectErrorObj.message
          : "An unexpected error occurred."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>Try Again</Button>
        <Button onClick={() => window.history.back()} variant="outline">Go Back</Button>
      </div>
    </div>
  );

  if (!project) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Project not found</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This project may have been deleted or you don't have access to it.
      </p>
      <Button onClick={() => window.history.back()} variant="outline">Go Back</Button>
    </div>
  );

  const isBulkSelected = Object.keys(rowSelection).length > 0;

  return (
    /* ROOT — overflow-x-hidden prevents any child from creating h-scroll */
    <div className="flex h-full w-full flex-col overflow-x-hidden bg-background/50">

      {/* ══════════════════════════════════════════════
          STICKY HEADER
          Mobile (<sm):  two rows
            Row 1: [icon][breadcrumb + title]
            Row 2: [progress pill] ··· [Members][Settings][New Task]
          sm+:   single row, left ↔ right
      ══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-card/80 backdrop-blur-md
        px-3 py-3
        sm:px-5 sm:py-4
        md:px-6">

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">

          {/* Left: project icon + breadcrumb + title */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm sm:h-10 sm:w-10">
              <Plus className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                <span className="cursor-pointer whitespace-nowrap hover:text-foreground">Projects</span>
                <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-50" />
                {/* max-w truncates long project names in the breadcrumb on tiny screens */}
                <span className="max-w-[110px] truncate text-foreground sm:max-w-[200px] md:max-w-none">
                  {project?.name}
                </span>
              </div>
              {/* h1 also truncates — it's the most prominent element so give it more room */}
              <h1 className="max-w-[200px] truncate text-base font-extrabold leading-none tracking-tight text-foreground sm:max-w-xs sm:text-xl md:max-w-none">
                {project?.name}
              </h1>
            </div>
          </div>

          {/* Right: progress pill + action buttons
              On mobile: full-width flex row so buttons never overflow.
              justify-between pushes progress left, buttons right.
              On sm+: auto width, justify-end. */}
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">

            {/* Progress */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5">
              <div className="h-1 w-10 overflow-hidden rounded-full bg-secondary sm:w-14">
                <div
                  className="h-full bg-primary transition-all duration-700"
                  style={{ width: `${projectProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">{projectProgress}%</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setShowMembers(true)}
                title="Members"
              >
                <Users className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setShowSettings(true)}
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
              {/* New Task: icon-only below 360 px, label visible from 360 px */}
              <Button
                className="h-8 gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 sm:h-9 sm:px-4"
                onClick={() => { setCreateTaskStatus("todo"); setShowCreateTask(true); }}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden min-[360px]:inline">New Task</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          TOOLBAR (tabs + search + filters)
          Mobile (<lg):
            Row 1: [List][Board][Milestones] ← horizontally scrollable
            Row 2: [Search ──────────────────]
            Row 3: [Status ▾]   [Priority ▾]
          lg+: tabs left | search + filters right on one row
      ══════════════════════════════════════════════ */}
      <div className="shrink-0 border-b border-border bg-card
        px-3 py-2.5
        sm:px-5 sm:py-3
        md:px-6">

        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">

          {/* Tab switcher
              Horizontally scrollable wrapper so the 3 tabs never wrap
              on phones narrower than 300 px. */}
          <div className="w-full overflow-x-auto scrollbar-none lg:w-auto lg:shrink-0">
            <div className="relative inline-flex items-center gap-0 rounded-xl border border-border/50 bg-accent/50 p-1">
              {/* Sliding indicator */}
              <div
                className="absolute h-[calc(100%-8px)] rounded-lg bg-background shadow-sm transition-all duration-300"
                style={{
                  width: "calc(33.33% - 4px)",
                  left:
                    activeTab === "list"
                      ? "4px"
                      : activeTab === "board"
                        ? "33.33%"
                        : "66.66%",
                  zIndex: 0,
                }}
              />
              {(["list", "board", "milestones"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative z-10 w-20 sm:w-28 lg:w-32 rounded-lg py-1.5 text-[10px] font-bold capitalize transition-all duration-200 sm:text-xs lg:text-sm",
                    activeTab === tab
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Search + filters
              Mobile:  stacked (search full-width, filters side-by-side)
              sm+:     inline row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

            {/* Search input — full width on mobile */}
            <div className="relative w-full sm:w-48 lg:w-44 xl:w-56">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border-border bg-muted/50 pl-9 text-xs focus:border-primary/50 focus:bg-background focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* Status + Priority — flex-1 on mobile so they share the row equally */}
            <div className="flex gap-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 flex-1 rounded-xl border-border bg-muted/50 text-[10px] font-bold text-muted-foreground focus:ring-4 focus:ring-primary/10 sm:w-28 sm:flex-none">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-lg">
                  <SelectItem value="all" className="text-[10px] font-bold">Any Status</SelectItem>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 flex-1 rounded-xl border-border bg-muted/50 text-[10px] font-bold text-muted-foreground focus:ring-4 focus:ring-primary/10 sm:w-28 sm:flex-none">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-lg">
                  <SelectItem value="all" className="text-[10px] font-bold">Any Priority</SelectItem>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════════ */}
      <main className="relative min-h-0 flex-1 overflow-y-auto bg-background/50
        p-3
        sm:p-4
        md:p-6">

        {/* Bulk action pill — fixed, bottom-centred
            w-[calc(100%-24px)] on mobile so it never overflows.
            sm+: auto width. */}
        {isBulkSelected && (
          <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-24px)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-border/10 bg-foreground px-4 py-2.5 shadow-2xl sm:w-auto sm:justify-start sm:gap-5 sm:px-5 sm:py-3 animate-fade-up">
            <span className="whitespace-nowrap text-xs font-bold text-background sm:text-sm">
              {Object.keys(rowSelection).length} selected
            </span>
            <div className="hidden h-4 w-px bg-muted-foreground/20 sm:block" />
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="h-7 bg-primary text-[10px] font-bold text-primary-foreground hover:bg-primary/90 sm:h-8 sm:text-xs"
                onClick={() => setIsBulkEditDialogOpen(true)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive/80 sm:h-8 sm:text-xs"
                onClick={handleBulkDelete}
              >
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px] opacity-60 hover:opacity-100 sm:h-8"
                onClick={() => setRowSelection({})}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {tasksLoading ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>

          /* Empty state */
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center sm:p-12">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 sm:h-16 sm:w-16">
              <ListTodo className="h-6 w-6 text-muted-foreground/30 sm:h-8 sm:w-8" />
            </div>
            <h3 className="mb-1 text-base font-bold text-foreground sm:text-lg">No tasks found</h3>
            <p className="mx-auto mb-6 max-w-xs text-xs text-muted-foreground sm:max-w-sm sm:text-sm">
              Create your first task to start tracking progress on this project.
            </p>
            <Button
              className="bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
              onClick={() => setShowCreateTask(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add first task
            </Button>
          </div>

        ) : (
          <>
            {/* ══ LIST ══ */}
            {activeTab === "list" && (
              <div className="space-y-5">
                {Object.entries(groupedTasks).map(([title, group]) => (
                  <div key={title}>
                    {groupBy !== "none" && (
                      <div className="mb-3 flex items-center gap-2 px-1">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {title}
                        </h3>
                        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground">
                          {group.length}
                        </span>
                      </div>
                    )}
                    {/*
                      overflow-hidden on the wrapper prevents TaskTable's
                      internal <table> from blowing out the layout on mobile.
                      The table itself should handle its own horizontal scroll.
                    */}
                    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                      <TaskTable
                        tasks={group}
                        users={usersMap}
                        milestones={milestones || []}
                        onTaskClick={handleTaskClick}
                        getTaskUrl={getTaskUrl}
                        onTaskUpdate={handleTaskUpdate}
                        onReorder={sortBy === "order" ? handleReorder : undefined}
                        onCreateSubtask={handleCreateSubtask}
                        expanded={expanded}
                        onExpandedChange={setExpanded}
                        rowSelection={rowSelection}
                        setRowSelection={setRowSelection}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══ BOARD ══
                320-639 px  : single column (flex-col, each col full-width)
                640-1023 px : 2-column CSS grid
                1024 px+    : horizontal-scroll flex row of fixed-width columns
            */}
            {activeTab === "board" && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="
                  flex flex-col gap-4 pb-4
                  sm:grid sm:grid-cols-2 sm:gap-4
                  lg:flex lg:flex-row lg:gap-5 lg:overflow-x-auto lg:pb-6
                ">
                  {TASK_STATUSES.map((s) => (
                    <div
                      key={s.id}
                      className="flex w-full flex-col sm:w-auto lg:w-72 lg:shrink-0 xl:w-80"
                    >
                      {/* Column header */}
                      <div className="mb-3 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
                          <h3 className="text-sm font-bold text-foreground">{s.label}</h3>
                          <span className="text-xs font-bold text-muted-foreground">
                            {tasks.filter((t) => t.status === s.id).length}
                          </span>
                        </div>
                        <button
                          onClick={() => { setCreateTaskStatus(s.id); setShowCreateTask(true); }}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Droppable area */}
                      <Droppable droppableId={s.id}>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="
                              flex-1 rounded-2xl border border-border/50 bg-muted/30 p-2
                              min-h-[140px]
                              lg:min-h-[500px]
                            "
                          >
                            {tasks
                              .filter((t) => t.status === s.id)
                              .map((t, i) => (
                                <Draggable key={t.id} draggableId={t.id} index={i}>
                                  {(p) => (
                                    <div
                                      ref={p.innerRef}
                                      {...p.draggableProps}
                                      {...p.dragHandleProps}
                                      style={p.draggableProps.style}
                                      className="pb-2"
                                    >
                                      <KanbanTaskCard
                                        task={t}
                                        user={t.assigneeId ? usersMap.get(t.assigneeId) : null}
                                        onClick={() => setLocation(getTaskUrl(t))}
                                        onToggleTimer={() => handleToggleTimer(t.id)}
                                        isActive={activeLogs && activeLogs.some((l) => l.taskId === t.id)}
                                        duration={taskDurations[t.id] || 0}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </DragDropContext>
            )}

            {/* ══ MILESTONES ══ */}
            {activeTab === "milestones" && (
              <div className="flex w-full flex-col gap-4">
                <div className="flex w-full items-center justify-between gap-3">
                  <h2 className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-lg font-bold text-transparent sm:text-xl">
                    Project Milestones
                  </h2>
                  <Button
                    onClick={() => setShowCreateMilestone(true)}
                    className="h-8 shrink-0 gap-1.5 rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 sm:h-9"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden min-[360px]:inline">New Milestone</span>
                  </Button>
                </div>

                {/* overflow-x-auto lets MilestoneBoard scroll horizontally
                    when needed rather than breaking the page layout */}
                <div className="w-full overflow-x-auto">
                  <MilestoneBoard
                    tasks={tasks}
                    users={usersMap}
                    onTaskClick={(t) => setLocation(getTaskUrl(t))}
                    onAddTask={(m) => {
                      setCreateTaskStatus("todo");
                      setCreateTaskMilestone(m);
                      setShowCreateTask(true);
                    }}
                    activeTaskId={
                      activeLogs &&
                      activeLogs.find((l) => l.taskId && tasks.some((t) => t.id === l.taskId))
                        ?.taskId
                    }
                    onToggleTimer={handleToggleTimer}
                    taskDurations={taskDurations}
                    milestones={stableMilestones}
                    onDragEnd={handleMilestoneDragEnd}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Dialogs — UNCHANGED ── */}
      <CreateTaskDialog
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={project?.id || ""}
        initialStatus={createTaskStatus}
        initialMilestone={createTaskMilestone}
        members={Array.from(usersMap.values()).filter(Boolean)}
      />
      {creatingSubtaskFor && (
        <CreateTaskDialog
          open={!!creatingSubtaskFor}
          onClose={() => setCreatingSubtaskFor(null)}
          projectId={project?.id || ""}
          parentId={creatingSubtaskFor}
          members={Array.from(usersMap.values()).filter(Boolean)}
          onSuccess={(c: any) =>
            c.parentId &&
            setExpanded((e: any) => (e === true ? true : { ...e, [c.parentId]: true }))
          }
        />
      )}
      <CreateMilestoneDialog
        open={showCreateMilestone}
        onClose={() => setShowCreateMilestone(false)}
        projectId={project?.id || ""}
      />
      <ProjectMembersDialog
        open={showMembers}
        onClose={() => setShowMembers(false)}
        project={project!}
        memberData={memberData || []}
      />
      {project && (
        <ProjectSettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          project={project}
        />
      )}
      <BulkEditDialog
        open={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
        selectedCount={Object.keys(rowSelection).length}
        users={usersMap}
        onConfirm={handleBulkUpdate}
        isSubmitting={false}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════
   KANBAN TASK CARD
   Fixes vs original:
   • overflow-hidden on card — priority stripe can't bleed out
   • line-clamp-2 + pr-3 — title clears the stripe
   • flex footer with gap — avatar & timer never overlap on narrow cards
════════════════════════════════════════════════ */
function KanbanTaskCard({ task, user, onClick, onToggleTimer, isActive, duration }: any) {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:shadow-md"
    >
      {/* Priority stripe — right edge, full height */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-1",
          TASK_PRIORITIES.find((p) => p.id === task.priority)?.color
        )}
      />

      {/* Title */}
      <h4 className="mb-2 line-clamp-2 pr-3 text-sm font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
        {task.title}
      </h4>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between gap-2">
        {/* Assignee avatar */}
        <div>
          {user ? (
            <Avatar className="h-6 w-6 border-2 border-background">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="bg-violet-100 text-[10px] font-bold text-violet-600">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted">
              <UserIcon className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Duration + timer */}
        <div className="flex items-center gap-1.5">
          {duration > 0 && (
            <span className="text-[10px] font-bold text-muted-foreground">
              {Math.floor(duration / 60)}m
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleTimer(); }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition-all",
              isActive
                ? "bg-amber-100/20 text-amber-600"
                : "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Clock className={cn("h-3.5 w-3.5", isActive && "animate-pulse")} />
          </button>
        </div>
      </div>
    </div>
  );
}
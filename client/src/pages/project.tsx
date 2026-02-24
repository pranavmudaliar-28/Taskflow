import { useState, useMemo, useEffect } from "react";
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
  ListTodo
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
import { cn } from "@/lib/utils";

type ProjectMemberWithUser = {
  id: string;
  projectId: string;
  userId: string;
  role: Role;
  addedAt: string | null;
  user: Omit<User, 'password'>;
};

const initials = (user: any) => {
  if (!user) return "?";
  return `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() || user.username?.charAt(0).toUpperCase() || "?";
};

const priorityIcon = (priority: string) => {
  const p = TASK_PRIORITIES.find(p => p.id === priority);
  if (!p) return null;
  const Icon = (p as any).icon;
  return <Icon className={cn("h-3.5 w-3.5", p.color)} />;
};

const statusIcon = (status: string) => {
  const s = TASK_STATUSES.find(s => s.id === status);
  if (!s) return null;
  const Icon = (s as any).icon;
  return <Icon className={cn("h-3.5 w-3.5", s.color)} />;
};

export default function ProjectPage() {
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

  // Time tracking state
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

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const queryParams = new URLSearchParams();
  if (project?.id) queryParams.append("projectId", project.id);
  if (debouncedSearch) queryParams.append("search", debouncedSearch);
  if (status !== "all") queryParams.append("status", status);
  if (priority !== "all") queryParams.append("priority", priority);
  queryParams.append("sortBy", sortBy);
  queryParams.append("sortOrder", sortBy === "order" ? "asc" : "desc");
  queryParams.append("limit", "1000");

  const { data: searchResult, isLoading: tasksLoading } = useQuery<{ tasks: Task[], total: number }>({
    queryKey: ["/api/tasks/search", project?.id, debouncedSearch, status, priority, sortBy],
    queryFn: async () => {
      if (!project?.id) return { tasks: [], total: 0 };
      const res = await fetch(`/api/tasks/search?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!project?.id,
  });

  const tasks = searchResult?.tasks || [];

  const { data: memberData, isLoading: membersLoading } = useQuery<ProjectMemberWithUser[]>({
    queryKey: ["/api/projects", project?.id, "members"],
    enabled: !!project?.id,
  });

  const { data: milestones, isLoading: milestonesLoading } = useQuery<Milestone[]>({
    queryKey: ["/api/projects", project?.id, "milestones"],
    enabled: !!project?.id,
  });

  const { data: activeLogs = [] } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs/active"],
    refetchInterval: 5000,
  });

  const { data: timeLogs } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs"],
  });

  useEffect(() => {
    if (activeLogs.length > 0) {
      const interval = setInterval(() => {
        const newElapsedTimes: Record<string, number> = {};
        activeLogs.forEach(log => {
          const start = new Date(log.startTime);
          newElapsedTimes[log.taskId] = differenceInSeconds(new Date(), start);
        });
        setElapsedTimes(newElapsedTimes);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTimes({});
    }
  }, [activeLogs]);

  const taskDurations = useMemo(() => {
    const durations: Record<string, number> = {};
    if (timeLogs) {
      timeLogs.forEach(log => {
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
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
    },
    onSuccess: () => {
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
    const isActive = activeLogs.some(log => log.taskId === taskId);
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
    memberData?.forEach((m) => map.set(m.userId, m.user as User));
    return map;
  }, [memberData]);

  const projectProgress = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === "done").length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  const getTaskUrl = (task: Task) => {
    const projectSlug = project?.slug || project?.id || id;
    if (task.parentId) {
      const parent = tasks.find(t => t.id === task.parentId);
      const parentSlug = parent?.slug || parent?.id || task.parentId;
      return `/projects/${projectSlug}/${parentSlug}/${task.slug || task.id}`;
    }
    return `/projects/${projectSlug}/${task.slug || task.id}`;
  };

  const buildTaskTree = (flatTasks: Task[]) => {
    const taskMap = new Map<string, Task & { subRows?: Task[] }>();
    const roots: (Task & { subRows?: Task[] })[] = [];
    flatTasks.forEach(task => taskMap.set(task.id, { ...task, subRows: [] }));
    flatTasks.forEach(task => {
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
    if (groupBy === "none") return { "Tasks": buildTaskTree(tasks) };
    const groups: Record<string, Task[]> = {};
    tasks.forEach(task => {
      let key = "Other";
      if (groupBy === "status") key = TASK_STATUSES.find(s => s.id === task.status)?.label || "Unknown";
      else if (groupBy === "priority") key = TASK_PRIORITIES.find(p => p.id === task.priority)?.label || "Unknown";
      else if (groupBy === "assignee") {
        const user = task.assigneeId ? usersMap.get(task.assigneeId) : null;
        key = user ? `${user.firstName} ${user.lastName}` : "Unassigned";
      } else if (groupBy === "milestone") key = milestones?.find(m => m.id === task.milestoneId)?.title || "No Milestone";
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return groups;
  }, [tasks, groupBy, usersMap, milestones]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    updateTaskMutation.mutate({ taskId: result.draggableId, updates: { status: newStatus as any } });
  };

  const handleMilestoneDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newId = result.destination.droppableId === "no-milestone" ? null : result.destination.droppableId;
    updateTaskMutation.mutate({ taskId: result.draggableId, updates: { milestoneId: newId } });
  };

  if (projectLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  if (!project) return null;

  const isBulkSelected = Object.keys(rowSelection).length > 0;

  return (
    <div className="flex flex-col h-full bg-background/50 overflow-hidden">
      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-[var(--page-padding)] py-4 shrink-0 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary flex items-center justify-center shadow-premium shrink-0">
              <Plus className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                <span className="hover:text-foreground cursor-pointer whitespace-nowrap">Projects</span>
                <ChevronRight className="h-2.5 w-2.5 opacity-50 shrink-0" />
                <span className="text-foreground truncate">{project.name}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight leading-none truncate">{project.name}</h1>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-lg border border-border">
              <div className="w-12 sm:w-16 h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-700" style={{ width: `${projectProgress}%` }} />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">{projectProgress}%</span>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg" onClick={() => setShowMembers(true)} title="Members">
                <Users className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg" onClick={() => setShowSettings(true)} title="Settings">
                <Settings className="h-4 w-4" />
              </Button>
              <Button className="h-8 sm:h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-3 sm:px-4 shadow-premium transition-all text-xs" onClick={() => { setCreateTaskStatus("todo"); setShowCreateTask(true); }}>
                <Plus className="h-4 w-4 sm:mr-1.5" /> <span className="hidden xs:inline">New Task</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border px-[var(--page-padding)] py-3 shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-accent/50 border border-border/50 rounded-xl p-1 relative w-full sm:w-fit self-center lg:self-auto overflow-x-auto scrollbar-none">
          <div
            className="absolute h-[calc(100%-8px)] bg-background rounded-lg shadow-sm animate-tab-indicator transition-all duration-300"
            style={{
              width: "calc(33.33% - 4px)",
              left: activeTab === "list" ? "4px" : activeTab === "board" ? "33.33%" : "66.66%",
              zIndex: 0
            }}
          />
          <button
            onClick={() => setActiveTab("list")}
            className={cn(
              "relative z-10 px-3 sm:px-5 py-1.5 rounded-lg text-[10px] sm:text-xs lg:text-sm font-bold transition-all duration-200 flex-1 sm:w-28 whitespace-nowrap",
              activeTab === "list" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            List
          </button>
          <button
            onClick={() => setActiveTab("board")}
            className={cn(
              "relative z-10 px-3 sm:px-5 py-1.5 rounded-lg text-[10px] sm:text-xs lg:text-sm font-bold transition-all duration-200 flex-1 sm:w-28 whitespace-nowrap",
              activeTab === "board" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Board
          </button>
          <button
            onClick={() => setActiveTab("milestones")}
            className={cn(
              "relative z-10 px-3 sm:px-5 py-1.5 rounded-lg text-[10px] sm:text-xs lg:text-sm font-bold transition-all duration-200 flex-1 sm:w-28 whitespace-nowrap",
              activeTab === "milestones" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Milestones
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
          <div className="relative group w-full sm:flex-1 lg:w-48 transition-all">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full border-border bg-muted/50 focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-xl text-xs transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 flex-1 sm:w-[110px] rounded-xl border-border bg-muted/50 text-muted-foreground font-bold text-[10px] ring-offset-0 focus:ring-4 focus:ring-primary/10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-elevation">
                <SelectItem value="all" className="font-bold text-[10px]">Any Status</SelectItem>
                {TASK_STATUSES.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-[10px]">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-9 flex-1 sm:w-[110px] rounded-xl border-border bg-muted/50 text-muted-foreground font-bold text-[10px] ring-offset-0 focus:ring-4 focus:ring-primary/10">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-elevation">
                <SelectItem value="all" className="font-bold text-[10px]">Any Priority</SelectItem>
                {TASK_PRIORITIES.map(p => <SelectItem key={p.id} value={p.id} className="font-bold text-[10px]">{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Main View Area ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background/50 p-[var(--page-padding)] relative">
        {/* Bulk Action Pill */}
        {isBulkSelected && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-2xl shadow-2xl px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-5 border border-border/10 animate-fade-up w-[calc(100%-32px)] sm:w-auto justify-between sm:justify-start">
            <span className="text-[10px] sm:text-sm font-bold whitespace-nowrap">{Object.keys(rowSelection).length} selected</span>
            <div className="hidden sm:block w-px h-4 bg-muted-foreground/20" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button size="sm" className="h-7 sm:h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] sm:text-xs" onClick={() => setIsBulkEditDialogOpen(true)}>Edit</Button>
              <Button size="sm" variant="ghost" className="h-7 sm:h-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10 font-bold text-[10px] sm:text-xs" onClick={handleBulkDelete}>Delete</Button>
              <Button size="sm" variant="ghost" className="h-7 sm:h-8 opacity-60 hover:opacity-100 text-[10px] sm:text-xs px-2" onClick={() => setRowSelection({})}>X</Button>
            </div>
          </div>
        )}

        {tasksLoading ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center">
            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ListTodo className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">No tasks found</h3>
            <p className="text-muted-foreground text-[10px] sm:text-sm mb-6 max-w-sm mx-auto">Create your first task to start tracking progress on this project.</p>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs" onClick={() => setShowCreateTask(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add first task
            </Button>
          </div>
        ) : (
          <>
            {activeTab === "list" && (
              <div className="space-y-6">
                {Object.entries(groupedTasks).map(([title, group], idx) => (
                  <div key={title} className="animate-fade-up" style={{ animationDelay: `${idx * 100}ms` }}>
                    {groupBy !== "none" && (
                      <div className="flex items-center gap-2 mb-3 px-2">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
                        <span className="text-[9px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">{group.length}</span>
                      </div>
                    )}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                      <TaskTable
                        tasks={group}
                        users={usersMap}
                        milestones={milestones || []}
                        onTaskClick={(t) => setLocation(getTaskUrl(t))}
                        getTaskUrl={getTaskUrl}
                        onTaskUpdate={(id, up) => updateTaskMutation.mutate({ taskId: id, updates: up })}
                        onReorder={groupBy === "none" && sortBy === "order" ? handleReorder : undefined}
                        onCreateSubtask={(id) => setCreatingSubtaskFor(id)}
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

            {activeTab === "board" && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="h-full flex flex-col lg:flex-row gap-5 overflow-auto pb-4">
                  {TASK_STATUSES.map((s, idx) => (
                    <div key={s.id} className="min-w-full lg:min-w-[280px] lg:max-w-[320px] shrink-0 flex flex-col animate-fade-up" style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
                          <h3 className="text-sm font-bold text-foreground">{s.label}</h3>
                          <span className="text-xs font-bold text-muted-foreground">{tasks.filter(t => t.status === s.id).length}</span>
                        </div>
                        <button onClick={() => { setCreateTaskStatus(s.id); setShowCreateTask(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <Droppable droppableId={s.id}>
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 bg-muted/30 rounded-2xl p-2 min-h-[500px] border border-border/50">
                            {tasks.filter(t => t.status === s.id).map((t, i) => (
                              <Draggable key={t.id} draggableId={t.id} index={i}>
                                {(p) => (
                                  <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="mb-2">
                                    <KanbanTaskCard
                                      task={t}
                                      user={t.assigneeId ? usersMap.get(t.assigneeId) : null}
                                      onClick={() => setLocation(getTaskUrl(t))}
                                      onToggleTimer={() => handleToggleTimer(t.id)}
                                      isActive={activeLogs.some(l => l.taskId === t.id)}
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

            {activeTab === "milestones" && (
              <MilestoneBoard
                tasks={tasks}
                users={usersMap}
                onTaskClick={(t) => setLocation(getTaskUrl(t))}
                onAddTask={(m) => { setCreateTaskStatus("todo"); setCreateTaskMilestone(m); setShowCreateTask(true); }}
                activeTaskId={activeLogs.find(l => l.taskId && tasks.some(t => t.id === l.taskId))?.taskId}
                onToggleTimer={handleToggleTimer}
                taskDurations={taskDurations}
                milestones={milestones || []}
                onDragEnd={handleMilestoneDragEnd}
              />
            )}
          </>
        )}
      </main>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <CreateTaskDialog open={showCreateTask} onClose={() => setShowCreateTask(false)} projectId={project.id} initialStatus={createTaskStatus} initialMilestone={createTaskMilestone} members={Array.from(usersMap.values())} />
      {creatingSubtaskFor && <CreateTaskDialog open={!!creatingSubtaskFor} onClose={() => setCreatingSubtaskFor(null)} projectId={project.id} parentId={creatingSubtaskFor} members={Array.from(usersMap.values())} onSuccess={(c: any) => c.parentId && setExpanded((e: any) => e === true ? true : { ...e, [c.parentId]: true })} />}
      <CreateMilestoneDialog open={showCreateMilestone} onClose={() => setShowCreateMilestone(false)} projectId={project.id} />
      <ProjectMembersDialog open={showMembers} onClose={() => setShowMembers(false)} projectId={project.id} memberData={memberData || []} />
      <ProjectSettingsDialog open={showSettings} onClose={() => setShowSettings(false)} project={project} />

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

function KanbanTaskCard({ task, user, onClick, onToggleTimer, isActive, duration }: any) {
  return (
    <div onClick={onClick} className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
      <div className={cn("absolute top-0 right-0 w-1 h-full", TASK_PRIORITIES.find(p => p.id === task.priority)?.color)} />
      <h4 className="text-sm font-bold text-foreground mb-2 line-clamp-2 leading-snug group-hover:text-primary transition-colors tracking-tight">{task.title}</h4>
      <div className="flex items-center justify-between mt-3">
        <div className="flex -space-x-1.5 overflow-hidden">
          {user ? (
            <Avatar className="h-6 w-6 border-2 border-white">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-[10px] bg-violet-100 text-violet-600 font-bold">{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <UserIcon className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {duration > 0 && <span className="text-[10px] font-bold text-muted-foreground">{Math.floor(duration / 60)}m</span>}
          <button onClick={(e) => { e.stopPropagation(); onToggleTimer(); }} className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-all", isActive ? "bg-amber-100/20 text-amber-600" : "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary")}>
            <Clock className={cn("h-3.5 w-3.5", isActive && "animate-pulse")} />
          </button>
        </div>
      </div>
    </div>
  );
}

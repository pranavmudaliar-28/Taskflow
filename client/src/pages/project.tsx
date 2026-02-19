import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanColumn } from "@/components/kanban-column";
// TaskDetailDrawer removed
import { useLocation } from "wouter";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { ProjectMembersDialog } from "@/components/project-members-dialog";
import { ProjectSettingsDialog } from "@/components/project-settings-dialog";
import { CreateMilestoneDialog } from "@/components/create-milestone-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
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
  CheckCircle2
} from "lucide-react";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { BulkEditDialog } from "@/components/bulk-edit-dialog";
import { type RowSelectionState } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import type { Task, Project, Role, TimeLog, Milestone } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { differenceInSeconds } from "date-fns";
import { TaskTable } from "@/components/task-table";
import { MilestoneBoard } from "@/components/milestone-board";
import type { ExpandedState } from "@tanstack/react-table";

type ProjectMemberWithUser = {
  id: string;
  projectId: string;
  userId: string;
  role: Role;
  addedAt: string | null;
  user: Omit<User, 'password'>;
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
  /* viewMode state and toggle removed */

  // Time tracking state - track elapsed times for all active tasks
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

  // Build query string for API
  const queryParams = new URLSearchParams();
  if (project?.id) queryParams.append("projectId", project.id);
  if (debouncedSearch) queryParams.append("search", debouncedSearch);
  if (status !== "all") queryParams.append("status", status);
  if (priority !== "all") queryParams.append("priority", priority);
  queryParams.append("sortBy", sortBy);
  if (sortBy === "order") {
    queryParams.append("sortOrder", "asc");
  } else {
    queryParams.append("sortOrder", "desc");
  }
  queryParams.append("limit", "1000"); // Higher limit for project view logic

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

  // Fetch active logs (now returns array)
  const { data: activeLogs = [] } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs/active"],
    refetchInterval: 5000,
  });

  // Fetch all logs to calculate totals
  const { data: timeLogs } = useQuery<TimeLog[]>({
    queryKey: ["/api/timelogs"],
  });

  // Update elapsed times for all active timers
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
    // Add current elapsed time for active tasks
    Object.entries(elapsedTimes).forEach(([taskId, elapsed]) => {
      durations[taskId] = (durations[taskId] || 0) + elapsed;
    });
    return durations;
  }, [timeLogs, elapsedTimes]);

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
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", "/api/timelogs/stop", { taskId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs/active"] });
      toast({ title: "Timer stopped" });
    },
    onError: () => {
      toast({ title: "Failed to stop timer", variant: "destructive" });
    },
  });

  const handleToggleTimer = (taskId: string) => {
    const isActive = Array.isArray(activeLogs) && activeLogs.some(log => log.taskId === taskId);
    if (isActive) {
      stopTimerMutation.mutate(taskId);
    } else {
      startTimerMutation.mutate(taskId);
    }
  };

  const reorderTaskMutation = useMutation({
    mutationFn: async (items: { id: string; order: number }[]) => {
      await apiRequest("PATCH", "/api/tasks/reorder", { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
    },
  });



  const handleReorder = (items: { id: string; order: number }[]) => {
    reorderTaskMutation.mutate(items);
  };

  // Bulk Actions Mutations
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[], updates: Partial<Task> }) => {
      const res = await apiRequest("PATCH", "/api/tasks/bulk/update", { ids, updates });
      return res.json();
    },
    onSuccess: (updatedTasks) => {
      toast({
        title: "Tasks updated",
        description: `${updatedTasks.length} tasks have been updated.`,
      });
      setRowSelection({});
      setIsBulkEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tasks.",
        variant: "destructive",
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await apiRequest("DELETE", "/api/tasks/bulk/delete", { ids });
    },
    onSuccess: () => {
      toast({
        title: "Tasks deleted",
        description: "Selected tasks have been deleted.",
      });
      setRowSelection({});
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tasks.",
        variant: "destructive",
      });
    }
  });

  const handleBulkUpdate = (updates: Partial<Task>) => {
    const ids = Object.keys(rowSelection);
    bulkUpdateMutation.mutate({ ids, updates });
  };

  const handleBulkDelete = () => {
    const ids = Object.keys(rowSelection);
    if (confirm(`Are you sure you want to delete ${ids.length} tasks?`)) {
      bulkDeleteMutation.mutate(ids);
    }
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    updateTaskMutation.mutate({ taskId, updates });
  };

  const handleCreateSubtask = (parentId: string) => {
    setCreatingSubtaskFor(parentId);
  };

  const handleSubtaskCreated = (createdTask: any) => {
    if (createdTask.parentId) {
      setExpanded(prev => {
        if (prev === true) return true;
        return {
          ...prev,
          [createdTask.parentId]: true,
        };
      });
    }
  };

  const members = useMemo(() => memberData?.map(m => m.user as User) || [], [memberData]);

  const usersMap = useMemo(() => {
    const map = new Map<string, User>();
    memberData?.forEach((m) => map.set(m.userId, m.user as User));
    return map;
  }, [memberData]);



  // Build Task Tree for "None" grouping (Reusing safe logic)
  const buildTaskTree = (flatTasks: Task[]) => {
    const taskMap = new Map<string, Task & { subRows?: Task[] }>();
    const roots: (Task & { subRows?: Task[] })[] = [];

    flatTasks.forEach(task => {
      taskMap.set(task.id, { ...task, subRows: [] });
    });

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
    if (groupBy === "none") {
      return { "Tasks": buildTaskTree(tasks) };
    }

    const groups: Record<string, Task[]> = {};
    tasks.forEach(task => {
      let key = "Other";

      if (groupBy === "status") {
        key = TASK_STATUSES.find(s => s.id === task.status)?.label || "Unknown";
      } else if (groupBy === "priority") {
        key = TASK_PRIORITIES.find(p => p.id === task.priority)?.label || "Unknown";
      } else if (groupBy === "assignee") {
        if (task.assigneeId) {
          const user = usersMap.get(task.assigneeId);
          key = user ? `${user.firstName} ${user.lastName}` : "Unknown User";
        } else {
          key = "Unassigned";
        }
      } else if (groupBy === "dueDate") {
        if (!task.dueDate) {
          key = "No Due Date";
        } else {
          const date = new Date(task.dueDate);
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          if (date < today) {
            key = "Overdue";
          } else if (date.toDateString() === today.toDateString()) {
            key = "Today";
          } else if (date.toDateString() === tomorrow.toDateString()) {
            key = "Tomorrow";
          } else {
            key = "Later";
          }
        }
      } else if (groupBy === "milestone") {
        if (task.milestoneId) {
          key = milestones?.find(m => m.id === task.milestoneId)?.title || "Unknown Milestone";
        } else {
          key = "No Milestone";
        }
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return groups;
  }, [tasks, groupBy, usersMap]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    TASK_STATUSES.forEach((status) => {
      grouped[status.id] = filteredTasks.filter((t) => t.status === status.id);
    });
    return grouped;
  }, [filteredTasks]);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
    },
  });



  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    updateTaskMutation.mutate({
      taskId: draggableId,
      updates: { status: newStatus as any },
    });
  };

  const handleMilestoneDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // destination.droppableId is the milestoneId or "no-milestone"
    const newMilestoneId = destination.droppableId === "no-milestone" ? null : destination.droppableId;

    updateTaskMutation.mutate({
      taskId: draggableId,
      updates: { milestoneId: newMilestoneId },
    });
  };

  const handleTaskClick = (task: Task) => {
    setLocation(`/tasks/${task.slug || task.id}`);
  };

  const handleAddTask = (status: string) => {
    setCreateTaskStatus(status);
    setCreateTaskMilestone(undefined);
    setShowCreateTask(true);
  };

  const handleAddMilestoneTask = (milestone: string | undefined) => {
    setCreateTaskStatus("todo");
    setCreateTaskMilestone(milestone);
    setShowCreateTask(true);
  };

  if (projectLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 flex items-center justify-center h-[400px]">
        <div className="text-center">
          <p className="text-lg font-medium">Project not found</p>
          <p className="text-muted-foreground">This project may have been deleted or you don't have access.</p>
        </div>
      </div>
    );
  }



  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-project-name">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-muted-foreground mt-1 max-w-2xl">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {Object.keys(rowSelection).length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <span className="text-sm font-medium text-muted-foreground mr-2">
                    {Object.keys(rowSelection).length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBulkEditDialogOpen(true)}
                    className="h-8 gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Bulk Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="h-8 gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                  <div className="w-[1px] h-4 bg-border mx-1" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowMembers(true)} data-testid="button-project-members">
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} data-testid="button-project-settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button size="sm" onClick={() => handleAddTask("todo")} data-testid="button-add-task">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 border-b shrink-0 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8"
                data-testid="input-search-tasks"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              <Filter className="h-4 w-4 text-muted-foreground mr-2" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px] h-8">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-[150px] h-8">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[150px] h-8">
                  <SelectValue placeholder="Group By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="assignee">Assignee</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px] h-8">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="order">Custom Order</SelectItem>
                </SelectContent>
              </Select>

              {(status !== "all" || priority !== "all" || searchQuery || groupBy !== "none" || sortBy !== "createdAt") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatus("all");
                    setPriority("all");
                    setSearchQuery("");
                    setGroupBy("none");
                    setSortBy("order");
                  }}
                  className="h-8 px-2 lg:px-3"
                >
                  Reset
                  <X className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="list" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 border-b">
              <TabsList className="bg-transparent h-12 w-full justify-start gap-6 p-0">
                <TabsTrigger
                  value="list"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium"
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </TabsTrigger>
                <TabsTrigger
                  value="board"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Board
                </TabsTrigger>
                <TabsTrigger
                  value="milestones"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Milestones
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="flex-1 overflow-auto p-0 m-0 border-0">
              {tasksLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="p-4">
                  {Object.entries(groupedTasks).map(([groupTitle, groupTasks]) => (
                    <div key={groupTitle} className="space-y-2 mb-6">
                      {groupBy !== "none" && (
                        <div className="flex items-center gap-2 px-2">
                          <h3 className="font-semibold text-lg">{groupTitle}</h3>
                          <span className="text-muted-foreground text-sm bg-muted px-2 py-0.5 rounded-full">{groupTasks.length}</span>
                        </div>
                      )}
                      <TaskTable
                        tasks={groupTasks}
                        users={usersMap}
                        milestones={milestones || []}
                        onTaskClick={handleTaskClick}
                        onTaskUpdate={handleTaskUpdate}
                        onReorder={groupBy === "none" && sortBy === "order" ? handleReorder : undefined}
                        onCreateSubtask={handleCreateSubtask}
                        expanded={expanded}
                        onExpandedChange={setExpanded}
                        rowSelection={rowSelection}
                        setRowSelection={setRowSelection}
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="board" className="flex-1 overflow-hidden m-0 border-0">
              {tasksLoading ? (
                <div className="p-4 flex gap-4">
                  <Skeleton className="h-full w-64" />
                  <Skeleton className="h-full w-64" />
                  <Skeleton className="h-full w-64" />
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="h-full p-4 overflow-x-auto">
                    <div className="flex gap-4 h-full">
                      {TASK_STATUSES.map((status) => (
                        <KanbanColumn
                          key={status.id}
                          id={status.id}
                          title={status.label}
                          color={status.color}
                          tasks={tasks?.filter(t => t.status === status.id) || []}
                          users={usersMap}
                          onTaskClick={handleTaskClick}
                          onAddTask={() => handleAddTask(status.id)}
                          activeTaskId={Array.isArray(activeLogs) ? activeLogs.find(log => log.taskId && tasks?.some(t => t.id === log.taskId))?.taskId : undefined}
                          onToggleTimer={handleToggleTimer}
                          taskDurations={taskDurations}
                        />
                      ))}
                    </div>
                  </div>
                </DragDropContext>
              )}
            </TabsContent>

            <TabsContent value="milestones" className="flex-1 overflow-hidden m-0 border-0 flex flex-col">
              <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/10 shrink-0">
                <h3 className="text-sm font-medium text-muted-foreground">Milestones</h3>
                <Button size="sm" variant="secondary" onClick={() => setShowCreateMilestone(true)} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Milestone
                </Button>
              </div>
              {tasksLoading || milestonesLoading ? (
                <div className="p-4 flex gap-4">
                  <Skeleton className="h-full w-64" />
                  <Skeleton className="h-full w-64" />
                  <Skeleton className="h-full w-64" />
                </div>
              ) : (
                <MilestoneBoard
                  tasks={filteredTasks}
                  users={usersMap}
                  onTaskClick={handleTaskClick}
                  onAddTask={handleAddMilestoneTask}
                  activeTaskId={Array.isArray(activeLogs) ? activeLogs.find(log => log.taskId && tasks?.some(t => t.id === log.taskId))?.taskId : undefined}
                  onToggleTimer={handleToggleTimer}
                  taskDurations={taskDurations}
                  milestones={milestones || []}
                  onDragEnd={handleMilestoneDragEnd}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>



        <CreateTaskDialog
          open={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          projectId={project.id}
          initialStatus={createTaskStatus}
          initialMilestone={createTaskMilestone}
          members={members || []}
        />

        {creatingSubtaskFor && (
          <CreateTaskDialog
            open={!!creatingSubtaskFor}
            onClose={() => setCreatingSubtaskFor(null)}
            projectId={project.id}
            parentId={creatingSubtaskFor}
            members={members || []}
            onSuccess={handleSubtaskCreated}
          />
        )}

        <CreateMilestoneDialog
          open={showCreateMilestone}
          onClose={() => setShowCreateMilestone(false)}
          projectId={project.id}
        />

        <ProjectMembersDialog
          open={showMembers}
          onClose={() => setShowMembers(false)}
          projectId={project.id}
          memberData={memberData || []}
        />

        <ProjectSettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          project={project}
        />


      </div>
      {
        isBulkEditDialogOpen && (
          <BulkEditDialog
            open={isBulkEditDialogOpen}
            onOpenChange={setIsBulkEditDialogOpen}
            selectedCount={Object.keys(rowSelection).length}
            users={usersMap}
            onConfirm={handleBulkUpdate}
            isSubmitting={bulkUpdateMutation.isPending}
          />
        )
      }
    </>
  );
}

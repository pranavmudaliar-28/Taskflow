import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanColumn } from "@/components/kanban-column";
import { TaskDetailDrawer } from "@/components/task-detail-drawer";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { Input } from "@/components/ui/input";
import { 
  LayoutGrid, 
  List, 
  Plus, 
  Search, 
  Settings,
  Users
} from "lucide-react";
import { TASK_STATUSES } from "@/lib/constants";
import type { Task, Project } from "@shared/schema";
import type { User } from "@shared/models/auth";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<string>("todo");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/projects", id, "tasks"],
  });

  const { data: members, isLoading: membersLoading } = useQuery<User[]>({
    queryKey: ["/api/projects", id, "members"],
  });

  const usersMap = useMemo(() => {
    const map = new Map<string, User>();
    members?.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

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

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDrawer(true);
  };

  const handleAddTask = (status: string) => {
    setCreateTaskStatus(status);
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-project-name">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" data-testid="button-project-members">
              <Users className="h-4 w-4 mr-2" />
              Members
            </Button>
            <Button variant="outline" size="sm" data-testid="button-project-settings">
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

      {/* Toolbar */}
      <div className="p-4 border-b shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-tasks"
            />
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kanban" | "list")}>
              <TabsList>
                <TabsTrigger value="kanban" data-testid="tab-kanban-view">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list" data-testid="tab-list-view">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tasksLoading ? (
          <div className="p-4">
            <div className="flex gap-4">
              {TASK_STATUSES.map((status) => (
                <div key={status.id} className="w-[280px] space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : viewMode === "kanban" ? (
          <div className="h-full p-4 kanban-scroll">
            <div className="flex gap-4 h-full">
              {TASK_STATUSES.map((status) => (
                <KanbanColumn
                  key={status.id}
                  id={status.id}
                  title={status.label}
                  color={status.color}
                  tasks={tasksByStatus[status.id] || []}
                  users={usersMap}
                  onTaskClick={handleTaskClick}
                  onAddTask={() => handleAddTask(status.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No tasks found</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 rounded-md hover-elevate bg-card border cursor-pointer"
                  onClick={() => handleTaskClick(task)}
                  data-testid={`task-list-item-${task.id}`}
                >
                  <div className={`h-2 w-2 rounded-full ${TASK_STATUSES.find((s) => s.id === task.status)?.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {TASK_STATUSES.find((s) => s.id === task.status)?.label}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        open={showTaskDrawer}
        onClose={() => {
          setShowTaskDrawer(false);
          setSelectedTask(null);
        }}
        projectId={id}
        members={members || []}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={id}
        initialStatus={createTaskStatus}
      />
    </div>
  );
}

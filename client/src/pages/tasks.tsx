import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskTable } from "@/components/task-table";
import type { ExpandedState } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import type { Task, Project } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { Search, Filter, X, Trash2, CheckCircle2 } from "lucide-react";
// TaskDetailDrawer removed
import { useLocation } from "wouter";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Milestone } from "@shared/schema";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BulkEditDialog } from "@/components/bulk-edit-dialog";
import { type RowSelectionState } from "@tanstack/react-table";

export default function TasksPage() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<string>("all");
    const [priority, setPriority] = useState<string>("all");
    const [, setLocation] = useLocation();
    const [creatingSubtaskFor, setCreatingSubtaskFor] = useState<string | null>(null);
    const [groupBy, setGroupBy] = useState<string>("none");
    const [sortBy, setSortBy] = useState<string>("order");
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);

    const debouncedSearch = useDebounce(search, 300);

    // Build query string for API
    const queryParams = new URLSearchParams();
    if (debouncedSearch) queryParams.append("search", debouncedSearch);
    if (status !== "all") queryParams.append("status", status);
    if (priority !== "all") queryParams.append("priority", priority);
    queryParams.append("sortBy", sortBy);
    if (sortBy === "order") {
        queryParams.append("sortOrder", "asc");
    } else {
        queryParams.append("sortOrder", "desc");
    }
    // Add limit for pagination if needed, straightforward for now
    queryParams.append("limit", "100");

    const { data: searchResult, isLoading } = useQuery<{ tasks: Task[], total: number }>({
        queryKey: ["/api/tasks/search", debouncedSearch, status, priority, sortBy],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/search?${queryParams.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch tasks");
            return res.json();
        }
    });

    const { data: projects } = useQuery<Project[]>({
        queryKey: ["/api/projects"],
    });

    // We need to fetch all users to display assignee names correctly
    // For now, we might rely on project members if we had a way to get all organization members
    // Or we can fetch them if the API supported it.
    // Assuming we might have some issue with displaying users if we don't have them all.
    // Let's try to fetch members of all visible projects or just use what we have.
    // For this implementation, let's assume we can get organization members or similar.
    // Using a specific endpoint or just relying on what we can get.
    // Actually, TaskTable needs a Map<string, User>.

    // Let's try to workaround by fetching project members for all projects? That's too many requests.
    // Maybe we need an endpoint for "all my colleagues" or similar.
    // For now, let's look at how Dashboard does it. Dashboard might simpler or just show raw data?
    // Dashboard uses "/api/tasks/recent" and likely doesn't show assignee names perfectly if not loaded?
    // Wait, Dashboard doesn't use TaskTable. It uses its own list.

    // Let's create a simplified "getAllMembers" or similar mechanism or just accept missing names for a moment
    // until we add `GET /api/organization/members`. I'll assume we can use `useQuery` for project members 
    // if we iterate, but that's bad.
    // Let's add a `GET /api/users` or `GET /api/organization/members` if it exists.
    // From previous context, `GET /api/organizations/:id/members` exists.
    // But we need to know the organization ID. available in user.organizationId potentially.

    // Let's cheat a bit and use a hook or just fetch from a new endpoint if I made one? 
    // I didn't make one.
    // I'll leave `users` empty map for now and see if I can improve it later or if it breaks.
    // or I can fetch `/api/projects` and then for each project fetch members? No.

    // Actually, in `App.tsx` there is no global member fetch.
    // Let's use `create-project-dialog`'s approach? No.

    // I will just pass an empty map for users for now, and add a TODO.
    // Or better, I'll update the `searchTasks` endpoint to INCLUDE user data in the response?
    // That would be a "join" or "include". Drizzle can do `with: { assignee: true }`.
    // That would be much better.

    // BUT, `Task` type in frontend expects `assigneeId`. `TaskTable` expects `users` map.
    // Implementation plan didn't specify this "join".
    // I'll stick to the plan: Create the page. I'll pass empty map and maybe names will be missing.
    // I can check if project.tsx fetches members. It does: `/api/projects/${id}/members`.

    const tasks = searchResult?.tasks || [];

    const queryClient = useQueryClient();
    const { toast } = useToast();


    // Single Task Update Mutation
    const updateTaskMutation = useMutation({
        mutationFn: async ({ taskId, updates }: { taskId: string, updates: Partial<Task> }) => {
            const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
            return res.json();
        },
        onSuccess: (updatedTask) => {
            toast({
                title: "Task updated",
                description: `Task "${updatedTask.title}" has been updated.`,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update task.",
                variant: "destructive",
            });
        }
    });

    const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
        updateTaskMutation.mutate({ taskId, updates });
    };

    // Reorder Mutation
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

    const handleCreateSubtask = (parentId: string) => {
        setCreatingSubtaskFor(parentId);
    };

    const handleSubtaskCreated = useCallback((createdTask: any) => {
        if (createdTask.parentId) {
            setExpanded(prev => {
                if (prev === true) return true;
                return {
                    ...prev,
                    [createdTask.parentId]: true,
                };
            });
        }
    }, []);



    const handleTaskClick = (task: Task) => {
        setLocation(`/tasks/${task.slug || task.id}`);
    };

    // Fetch organization members to populate users map
    // We derive the organization ID from the first project or assume the user's primary org context
    const organizationId = projects?.[0]?.organizationId;
    const { data: members } = useQuery<any[]>({
        queryKey: [`/api/organizations/${organizationId}/members`],
        enabled: !!organizationId,
    });

    const usersMap = useMemo(() => {
        const map = new Map<string, User>();
        members?.forEach((m) => {
            if (m.user) {
                map.set(m.userId, m.user);
            }
        });
        return map;
    }, [members]);

    // Fetch organization milestones
    const { data: orgMilestones } = useQuery<Milestone[]>({
        queryKey: [`/api/organizations/${organizationId}/milestones`],
        enabled: !!organizationId,
    });

    // Build Task Tree for "None" grouping
    const buildTaskTree = (flatTasks: Task[]) => {
        const taskMap = new Map<string, Task & { subRows?: Task[] }>();
        const roots: (Task & { subRows?: Task[] })[] = [];

        // First pass: create map entries
        flatTasks.forEach(task => {
            taskMap.set(task.id, { ...task, subRows: [] });
        });

        // Second pass: link parents and children
        // We need to sort tasks to ensure parents/children order? 
        // Iterate original list which is already sorted by backend (createdAt or Order).
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

    // Grouping & Tree Logic
    const groupedTasks = useMemo(() => {
        if (groupBy === "none") {
            // Check if we should use tree view. 
            // If sort is 'order' or 'createdAt', tree is fine.
            // If filtering is active (search/status/priority), tree might be partial?
            // Usually search results return flat list. If parent is not strings, tree is broken.
            // Requirement: "Display subtasks (Tree View)".
            // If searching, maybe show flat?
            // Let's try to build tree always for "none". Orphans (parent not in list) become roots.
            return { "All Tasks": buildTaskTree(tasks) };
        }

        const groups: Record<string, Task[]> = {};
        // ... (rest of grouping logic)
        tasks.forEach(task => {
            let key = "Other";

            if (groupBy === "status") {
                key = TASK_STATUSES.find(s => s.id === task.status)?.label || "Unknown";
            } else if (groupBy === "priority") {
                key = TASK_PRIORITIES.find(p => p.id === task.priority)?.label || "Unknown";
            } else if (groupBy === "project") {
                key = projects?.find(p => p.id === task.projectId)?.name || "Unknown Project";
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
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });

        return groups;
    }, [tasks, groupBy, projects, usersMap]);



    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center justify-between p-4 border-b">
                <h1 className="text-2xl font-bold tracking-tight">
                    All Tasks
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({tasks.length} total
                        {groupBy === "none" && groupedTasks["All Tasks"]
                            ? `, ${groupedTasks["All Tasks"].length} roots`
                            : ""}
                        )
                    </span>
                </h1>
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
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 p-4 border-b bg-muted/10">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 w-full max-w-sm"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                    <Filter className="h-4 w-4 text-muted-foreground mr-2" />
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[150px]">
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
                        <SelectTrigger className="w-[150px]">
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
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Group By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Grouping</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="priority">Priority</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="assignee">Assignee</SelectItem>
                            <SelectItem value="dueDate">Due Date</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[150px]">
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

                    {(status !== "all" || priority !== "all" || search || groupBy !== "none" || sortBy !== "createdAt") && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setStatus("all");
                                setPriority("all");
                                setSearch("");
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

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <p className="text-muted-foreground">Loading tasks...</p>
                    </div>
                ) : (
                    Object.entries(groupedTasks).map(([groupTitle, groupTasks]) => (
                        <div key={groupTitle} className="space-y-2">
                            {groupBy !== "none" && (
                                <div className="flex items-center gap-2 px-2">
                                    <h3 className="font-semibold text-lg">{groupTitle}</h3>
                                    <span className="text-muted-foreground text-sm bg-muted px-2 py-0.5 rounded-full">{groupTasks.length}</span>
                                </div>
                            )}
                            <TaskTable
                                tasks={groupTasks}
                                users={usersMap}
                                milestones={orgMilestones || []}
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
                    ))
                )}
            </div>

            {/* Helper to get project ID for the drawer? 
          TaskDetailDrawer needs projectId. The task has projectId.
          We can pass it from the selected task.
      */}


            {creatingSubtaskFor && (
                <CreateTaskDialog
                    open={!!creatingSubtaskFor}
                    onClose={() => setCreatingSubtaskFor(null)}
                    projectId={tasks.find(t => t.id === creatingSubtaskFor)?.projectId || projects?.[0]?.id || ""}
                    parentId={creatingSubtaskFor}
                    members={Array.from(usersMap.values())}
                    projects={projects}
                    onSuccess={handleSubtaskCreated}
                />
            )}


            {isBulkEditDialogOpen && (
                <BulkEditDialog
                    open={isBulkEditDialogOpen}
                    onOpenChange={setIsBulkEditDialogOpen}
                    selectedCount={Object.keys(rowSelection).length}
                    users={usersMap}
                    onConfirm={handleBulkUpdate}
                    isSubmitting={bulkUpdateMutation.isPending}
                />
            )}
        </div>
    );
}

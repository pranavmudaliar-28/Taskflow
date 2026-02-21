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
import {
    Search, Filter, X, Trash2, CheckCircle2,
    ListTodo, Plus, LayoutGrid, List, SlidersHorizontal, Flag,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

/* ── helpers ─────────────────────────────────────────────── */

function TasksSkeletonRow() {
    return (
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-50/50">
            <Skeleton className="h-4 w-4 rounded-md opacity-20" />
            <Skeleton className="h-4 w-4 rounded-full opacity-20" />
            <Skeleton className="h-4 flex-1 max-w-[240px] rounded opacity-20" />
            <div className="ml-auto flex items-center gap-4">
                <Skeleton className="h-5 w-16 rounded-full opacity-10" />
                <Skeleton className="h-5 w-16 rounded-full opacity-10" />
                <Skeleton className="h-8 w-8 rounded-full opacity-10" />
            </div>
        </div>
    );
}

function EmptyState({ hasFilters, onClear, onCreate }: { hasFilters: boolean; onClear: () => void; onCreate: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
                <ListTodo className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
                {hasFilters ? "No tasks match your filters" : "No tasks yet"}
            </h3>
            <p className="text-sm text-slate-400 max-w-xs mb-6">
                {hasFilters
                    ? "Try clearing your filters to see all tasks."
                    : "Create your first task to get started. Tasks help you track and organize all your work."}
            </p>
            {hasFilters ? (
                <Button variant="outline" size="sm" onClick={onClear} className="gap-2">
                    <X className="h-4 w-4" /> Clear filters
                </Button>
            ) : (
                <Button size="sm" onClick={onCreate}
                    className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                    <Plus className="h-4 w-4" /> Create task
                </Button>
            )}
        </div>
    );
}

/* ── main page ───────────────────────────────────────────── */

export default function TasksPage() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<string>("all");
    const [priority, setPriority] = useState<string>("all");
    const [, setLocation] = useLocation();
    const [creatingSubtaskFor, setCreatingSubtaskFor] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [groupBy, setGroupBy] = useState<string>("none");
    const [sortBy, setSortBy] = useState<string>("order");
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);

    const debouncedSearch = useDebounce(search, 300);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const queryParams = new URLSearchParams();
    if (debouncedSearch) queryParams.append("search", debouncedSearch);
    if (status !== "all") queryParams.append("status", status);
    if (priority !== "all") queryParams.append("priority", priority);
    queryParams.append("sortBy", sortBy);
    queryParams.append("sortOrder", sortBy === "order" ? "asc" : "desc");
    queryParams.append("limit", "100");

    const { data: searchResult, isLoading } = useQuery<{ tasks: Task[], total: number }>({
        queryKey: ["/api/tasks/search", debouncedSearch, status, priority, sortBy],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/search?${queryParams.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch tasks");
            return res.json();
        }
    });

    const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

    const tasks = searchResult?.tasks || [];
    const organizationId = projects?.[0]?.organizationId;

    const { data: members } = useQuery<any[]>({
        queryKey: [`/api/organizations/${organizationId}/members`],
        enabled: !!organizationId,
    });

    const { data: orgMilestones } = useQuery<Milestone[]>({
        queryKey: [`/api/organizations/${organizationId}/milestones`],
        enabled: !!organizationId,
    });

    const usersMap = useMemo(() => {
        const map = new Map<string, User>();
        members?.forEach((m) => { if (m.user) map.set(m.userId, m.user); });
        return map;
    }, [members]);

    /* mutations ------------------------------------------------ */
    const updateTaskMutation = useMutation({
        mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
            const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] }),
        onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
    });

    const reorderTaskMutation = useMutation({
        mutationFn: async (items: { id: string; order: number }[]) =>
            apiRequest("PATCH", "/api/tasks/reorder", { items }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] }),
    });

    const bulkUpdateMutation = useMutation({
        mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Task> }) => {
            const res = await apiRequest("PATCH", "/api/tasks/bulk/update", { ids, updates });
            return res.json();
        },
        onSuccess: (updated) => {
            toast({ title: `${updated.length} tasks updated` });
            setRowSelection({});
            setIsBulkEditDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
        },
        onError: () => toast({ title: "Bulk update failed", variant: "destructive" }),
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) =>
            apiRequest("DELETE", "/api/tasks/bulk/delete", { ids }),
        onSuccess: () => {
            toast({ title: "Tasks deleted" });
            setRowSelection({});
            queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
        },
        onError: () => toast({ title: "Failed to delete tasks", variant: "destructive" }),
    });

    /* handlers ------------------------------------------------- */
    const handleTaskUpdate = (taskId: string, updates: Partial<Task>) =>
        updateTaskMutation.mutate({ taskId, updates });

    const handleReorder = (items: { id: string; order: number }[]) =>
        reorderTaskMutation.mutate(items);

    const handleBulkUpdate = (updates: Partial<Task>) =>
        bulkUpdateMutation.mutate({ ids: Object.keys(rowSelection), updates });

    const handleBulkDelete = () => {
        const ids = Object.keys(rowSelection);
        if (confirm(`Delete ${ids.length} tasks?`)) bulkDeleteMutation.mutate(ids);
    };

    const handleCreateSubtask = (parentId: string) => setCreatingSubtaskFor(parentId);

    const handleSubtaskCreated = useCallback((task: any) => {
        if (task.parentId) {
            setExpanded(prev => prev === true ? true : { ...prev as object, [task.parentId]: true });
        }
    }, []);

    const getTaskUrl = useCallback((task: Task) => {
        const project = projects?.find(p => p.id === task.projectId);
        const projectSlug = project?.slug || project?.id || task.projectId;
        if (task.parentId) {
            const parent = tasks.find(t => t.id === task.parentId);
            const parentSlug = parent?.slug || parent?.id || task.parentId;
            return `/projects/${projectSlug}/${parentSlug}/${task.slug || task.id}`;
        }
        return `/projects/${projectSlug}/${task.slug || task.id}`;
    }, [projects, tasks]);

    const handleTaskClick = (task: Task) => setLocation(getTaskUrl(task));

    const resetFilters = () => {
        setStatus("all"); setPriority("all"); setSearch("");
        setGroupBy("none"); setSortBy("order");
    };

    const hasActiveFilters = status !== "all" || priority !== "all" || !!search || groupBy !== "none" || sortBy !== "order";
    const selectedCount = Object.keys(rowSelection).length;

    /* grouping ------------------------------------------------- */
    const buildTaskTree = (flatTasks: Task[]) => {
        const taskMap = new Map<string, Task & { subRows?: Task[] }>();
        const roots: (Task & { subRows?: Task[] })[] = [];
        flatTasks.forEach(t => taskMap.set(t.id, { ...t, subRows: [] }));
        flatTasks.forEach(t => {
            const node = taskMap.get(t.id)!;
            if (t.parentId && taskMap.has(t.parentId)) {
                taskMap.get(t.parentId)!.subRows!.push(node);
            } else roots.push(node);
        });
        return roots;
    };

    const groupedTasks = useMemo(() => {
        if (groupBy === "none") return { "All Tasks": buildTaskTree(tasks) };
        const groups: Record<string, Task[]> = {};
        tasks.forEach(task => {
            let key = "Other";
            if (groupBy === "status") key = TASK_STATUSES.find(s => s.id === task.status)?.label || "Unknown";
            else if (groupBy === "priority") key = TASK_PRIORITIES.find(p => p.id === task.priority)?.label || "Unknown";
            else if (groupBy === "project") key = projects?.find(p => p.id === task.projectId)?.name || "Unknown";
            else if (groupBy === "assignee") {
                key = task.assigneeId ? (usersMap.get(task.assigneeId) ? `${usersMap.get(task.assigneeId)!.firstName} ${usersMap.get(task.assigneeId)!.lastName}` : "Unknown") : "Unassigned";
            } else if (groupBy === "dueDate") {
                if (!task.dueDate) { key = "No Due Date"; }
                else {
                    const d = new Date(task.dueDate), today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                    if (d < today) key = "Overdue";
                    else if (d.toDateString() === today.toDateString()) key = "Today";
                    else if (d.toDateString() === tomorrow.toDateString()) key = "Tomorrow";
                    else key = "Upcoming";
                }
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });
        return groups;
    }, [tasks, groupBy, projects, usersMap]);

    /* render --------------------------------------------------- */
    return (
        <div className="flex flex-col h-full bg-slate-50">

            {/* ── Page header ── */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#020617] tracking-tight">All Tasks</h1>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                            {isLoading ? "Loading…" : `${searchResult?.total ?? 0} tasks`}
                            {hasActiveFilters && " · filtered"}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Bulk action bar */}
                        {selectedCount > 0 && (
                            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5 animate-in fade-in slide-in-from-top-1">
                                <span className="text-xs font-semibold text-violet-700">{selectedCount} selected</span>
                                <div className="w-[1px] h-3 bg-violet-200" />
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-violet-700 hover:text-violet-900 hover:bg-violet-100 px-2"
                                    onClick={() => setIsBulkEditDialogOpen(true)}>
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                                    onClick={handleBulkDelete}>
                                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                            </div>
                        )}

                        <Button
                            size="sm"
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-[#020617] hover:bg-slate-800 text-white font-semibold px-5 h-10 rounded-xl transition-all"
                        >
                            <Plus className="h-4 w-4" /> New Task
                        </Button>
                    </div>
                </div>

                {/* ── Filter bar ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search tasks…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 bg-white border-slate-200 focus:border-slate-300 focus:ring-4 focus:ring-slate-100/50 text-sm rounded-xl transition-all"
                        />
                        {search && (
                            <button onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block" />

                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="h-10 w-40 text-xs bg-slate-50/50 border-slate-100 hover:bg-slate-100 hover:border-slate-200 rounded-xl font-bold text-slate-500 transition-all focus:ring-4 focus:ring-slate-50">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-3 w-3 opacity-50" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-elevation">
                                <SelectItem value="all" className="text-xs font-bold">All Statuses</SelectItem>
                                {TASK_STATUSES.map(s => <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger className="h-10 w-40 text-xs bg-slate-50/50 border-slate-100 hover:bg-slate-100 hover:border-slate-200 rounded-xl font-bold text-slate-500 transition-all focus:ring-4 focus:ring-slate-50">
                                <div className="flex items-center gap-2">
                                    <Flag className="h-3 w-3 opacity-50" />
                                    <SelectValue placeholder="Priority" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-elevation">
                                <SelectItem value="all" className="text-xs font-bold">All Priorities</SelectItem>
                                {TASK_PRIORITIES.map(p => <SelectItem key={p.id} value={p.id} className="text-xs font-bold">{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={groupBy} onValueChange={setGroupBy}>
                            <SelectTrigger className="h-10 w-40 text-xs bg-slate-50/50 border-slate-100 hover:bg-slate-100 hover:border-slate-200 rounded-xl font-bold text-slate-500 transition-all focus:ring-4 focus:ring-slate-50">
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="h-3 w-3 opacity-50" />
                                    <SelectValue placeholder="Group by" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-elevation">
                                <SelectItem value="none" className="text-xs font-bold">No grouping</SelectItem>
                                <SelectItem value="status" className="text-xs font-bold">By Status</SelectItem>
                                <SelectItem value="priority" className="text-xs font-bold">By Priority</SelectItem>
                                <SelectItem value="project" className="text-xs font-bold">By Project</SelectItem>
                                <SelectItem value="assignee" className="text-xs font-bold">By Assignee</SelectItem>
                                <SelectItem value="dueDate" className="text-xs font-bold">By Due Date</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block" />

                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={resetFilters}
                                className="h-10 text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all gap-1.5">
                                <X className="h-3.5 w-3.5" /> Reset
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Task list ── */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="bg-white rounded-xl border border-slate-100 mx-4 mt-4 overflow-hidden shadow-sm">
                        {Array.from({ length: 8 }).map((_, i) => <TasksSkeletonRow key={i} />)}
                    </div>
                ) : tasks.length === 0 ? (
                    <EmptyState
                        hasFilters={hasActiveFilters}
                        onClear={resetFilters}
                        onCreate={() => setIsCreateOpen(true)}
                    />
                ) : (
                    <div className="p-4 space-y-5">
                        {Object.entries(groupedTasks).map(([groupTitle, groupTasks]) => (
                            <div key={groupTitle}>
                                {groupBy !== "none" && (
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                        <h3 className="text-sm font-bold text-slate-700">{groupTitle}</h3>
                                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                                            {groupTasks.length}
                                        </span>
                                    </div>
                                )}
                                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                                    <TaskTable
                                        tasks={groupTasks}
                                        users={usersMap}
                                        milestones={orgMilestones || []}
                                        onTaskClick={handleTaskClick}
                                        getTaskUrl={getTaskUrl}
                                        onTaskUpdate={handleTaskUpdate}
                                        onReorder={groupBy === "none" && sortBy === "order" ? handleReorder : undefined}
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
            </div>

            {/* Dialogs */}
            {isCreateOpen && (
                <CreateTaskDialog
                    open={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    projectId={projects?.[0]?.id || ""}
                    members={Array.from(usersMap.values())}
                    projects={projects}
                />
            )}

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
                    selectedCount={selectedCount}
                    users={usersMap}
                    onConfirm={handleBulkUpdate}
                    isSubmitting={bulkUpdateMutation.isPending}
                />
            )}
        </div>
    );
}

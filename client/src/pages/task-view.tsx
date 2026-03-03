import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Calendar as CalendarIcon,
    Clock,
    AlertCircle,
    Send,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Layout,
    ListTodo,
    Share2,
    Copy,
    Trash,
    Plus,
    Flag,
    Play,
    Square,
    X,
    SlidersHorizontal,
    CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { cn, ensureArray } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Task, Comment, TimeLog, Milestone } from "@shared/schema";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { TaskAttachments } from "@/components/task-attachments";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { formatDurationShort } from "@/lib/utils";

/* ─── micro helpers ─── */
const getInitials = (u: any) =>
    u
        ? ((u.firstName?.[0] || "") + (u.lastName?.[0] || "")).toUpperCase() ||
        u.username?.[0]?.toUpperCase() ||
        "?"
        : "?";

function ColorDot({ className }: { className?: string }) {
    return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)} />;
}

function Divider() {
    return <div className="h-px w-full bg-border/60" />;
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <h3 className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            {icon} {label}
        </h3>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {children}
        </p>
    );
}

/* ════════════════════════════════════════════════
   TASK VIEW
════════════════════════════════════════════════ */
export default function TaskView() {
    /* routing */
    const [, paramsTask] = useRoute("/tasks/:id");
    const [, paramsProjectTask] = useRoute("/projects/:projectId/:taskId");
    const [, paramsSubTask] = useRoute("/projects/:projectId/:parentTaskId/:taskId");
    const taskId = paramsTask?.id || paramsProjectTask?.taskId || paramsSubTask?.taskId;
    const projectIdParam = paramsProjectTask?.projectId || paramsSubTask?.projectId;
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { user: me } = useAuth();
    const queryClient = useQueryClient();

    /* local state */
    const [comment, setComment] = useState("");
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [showCreateSubtask, setShowCreateSubtask] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionIndex, setMentionIndex] = useState(0);
    const commentRef = useRef<HTMLTextAreaElement>(null);

    /* queries */
    const {
        data: task,
        isLoading: taskLoading,
        isError: taskError,
        error: taskErrorObj,
    } = useQuery<Task>({ queryKey: [`/api/tasks/${taskId}`], enabled: !!taskId });

    useEffect(() => { if (task) setEditTitle(task.title); }, [task?.id]);

    const { data: project } = useQuery<any>({
        queryKey: [`/api/projects/${task?.projectId || projectIdParam}`],
        enabled: !!(task?.projectId || projectIdParam),
    });
    const { data: parentTask } = useQuery<Task>({
        queryKey: [`/api/tasks/${task?.parentId}`],
        enabled: !!task?.parentId,
    });
    const { data: members } = useQuery<any[]>({
        queryKey: [`/api/projects/${task?.projectId || projectIdParam}/members`],
        enabled: !!(task?.projectId || projectIdParam),
    });
    const { data: subtasks } = useQuery<{ tasks: Task[] }>({
        queryKey: ["/api/tasks/search", task?.projectId, { parentId: task?.id }],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/search?projectId=${task?.projectId}&parentId=${task?.id}`);
            if (!res.ok) throw new Error("Failed to fetch subtasks");
            return res.json();
        },
        enabled: !!task?.id && !!task?.projectId,
    });
    const { data: comments } = useQuery<Comment[]>({
        queryKey: [`/api/tasks/${task?.id}/comments`],
        enabled: !!task?.id,
    });
    const { data: timeLogs } = useQuery<TimeLog[]>({ queryKey: ["/api/timelogs"] });
    const { data: activeLogs } = useQuery<TimeLog[]>({
        queryKey: ["/api/timelogs/active"],
        refetchInterval: 5000,
    });
    const { data: orgMembers } = useQuery<any[]>({
        queryKey: [`/api/organizations/members`],
        enabled: !!project?.organizationId,
    });
    const { data: milestones } = useQuery<Milestone[]>({
        queryKey: [`/api/projects/${task?.projectId || projectIdParam}/milestones`],
        enabled: !!(task?.projectId || projectIdParam),
    });

    /* derived */
    const usersMap = useMemo(() => {
        const map = new Map<string, any>();
        ensureArray(orgMembers).forEach((m) => { if (m.user) map.set(m.userId, m.user); });
        ensureArray(members).forEach((m) => { if (!map.has(m.userId) && m.user) map.set(m.userId, m.user); });
        return map;
    }, [orgMembers, members]);

    const statusMeta = useMemo(() => TASK_STATUSES.find((s) => s.id === task?.status), [task?.status]);
    const priorityMeta = useMemo(() => TASK_PRIORITIES.find((p) => p.id === task?.priority), [task?.priority]);
    const milestoneMeta = useMemo(() => milestones?.find((m) => m.id === task?.milestoneId), [milestones, task?.milestoneId]);

    const isTracking = useMemo(() => !!activeLogs?.some((l) => l.taskId === task?.id), [activeLogs, task?.id]);
    const totalTracked = useMemo(
        () => (timeLogs || []).filter((l) => l.taskId === task?.id).reduce((a, l) => a + (l.duration || 0), 0),
        [timeLogs, task?.id]
    );

    const filteredMentions = useMemo(
        () => (orgMembers || members || []).filter(
            (m) => m.user && `${m.user.firstName || ""} ${m.user.lastName || ""}`.toLowerCase().includes(mentionQuery)
        ),
        [orgMembers, members, mentionQuery]
    );

    /* ════════════════════════════════
       COMMENT TREE
    ════════════════════════════════ */
    const commentMap = useMemo(() => {
        const map = new Map<string | null, Comment[]>();
        comments?.forEach((c) => {
            const pid = c.parentId || null;
            if (!map.has(pid)) map.set(pid, []);
            map.get(pid)!.push(c);
        });
        return map;
    }, [comments]);

    /* mutations */
    const updateTask = useMutation({
        mutationFn: async (updates: Partial<Task>) => {
            const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
            if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
            return res.json();
        },
        onSuccess: (updated: Task) => {
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
            if (updated.id !== taskId) queryClient.invalidateQueries({ queryKey: [`/api/tasks/${updated.id}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
            queryClient.invalidateQueries({ queryKey: ["/api/tasks/recent"] });
            if (updated.projectId) {
                queryClient.invalidateQueries({ queryKey: ["/api/tasks/search", updated.projectId] });
                queryClient.invalidateQueries({ queryKey: [`/api/projects/${updated.projectId}/tasks`] });
            }
            toast({ title: "Task updated" });
        },
        onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
    });

    const createComment = useMutation({
        mutationFn: async ({ content, mentions, parentId }: { content: string; mentions: string[]; parentId?: string | null }) => {
            const res = await apiRequest("POST", `/api/tasks/${task?.id}/comments`, { content, mentions, parentId });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/comments`] });
            setComment(""); setReplyTo(null);
            toast({ title: "Comment added" });
        },
    });

    const toggleReaction = useMutation({
        mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
            const res = await apiRequest("POST", `/api/comments/${commentId}/react`, { emoji });
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/comments`] }),
    });

    const deleteTask = useMutation({
        mutationFn: async () => { await apiRequest("DELETE", `/api/tasks/${task?.id}`); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); // instant update for time-tracking dropdown
            queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
            toast({ title: "Task deleted" });
            setLocation("/tasks");
        },
    });

    const startTimer = useMutation({
        mutationFn: async (id: string) => (await apiRequest("POST", "/api/timelogs/start", { taskId: id })).json(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/timelogs/active"] });
            toast({ title: "Timer started" });
        },
    });

    const stopTimer = useMutation({
        mutationFn: async (id: string) => (await apiRequest("POST", "/api/timelogs/stop", { taskId: id })).json(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/timelogs/active"] });
            toast({ title: "Timer stopped" });
        },
    });

    /* handlers */
    const handleShare = () => {
        if (!task) return;
        navigator.clipboard.writeText(`${window.location.origin}/tasks/${task.slug || task.id}`);
        toast({ title: "Link copied!" });
    };

    const handleSendComment = (parentId?: string | null) => {
        if (!comment.trim() || !task) return;
        const matches = comment.match(/@([a-zA-Z]+\s[a-zA-Z]+)/g) || [];
        const mentions: string[] = [];
        matches.forEach((m) => {
            const name = m.slice(1);
            const found = (orgMembers || members)?.find(
                (mem) => mem.user && `${mem.user.firstName} ${mem.user.lastName}` === name
            );
            if (found) mentions.push(found.userId);
        });
        createComment.mutate({ content: comment, mentions, parentId: parentId ?? replyTo });
    };

    const handleCommentInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const cursor = e.target.selectionStart || 0;
        const before = val.slice(0, cursor);
        const mm = before.match(/@(\w*)$/);
        setComment(val);
        if (mm) { setShowMentions(true); setMentionQuery(mm[1].toLowerCase()); setMentionIndex(0); }
        else setShowMentions(false);
    };

    const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showMentions) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, filteredMentions.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); }
        if (e.key === "Enter" && filteredMentions[mentionIndex]) { e.preventDefault(); handleSelectMention(filteredMentions[mentionIndex]); }
        if (e.key === "Escape") setShowMentions(false);
    };

    const handleSelectMention = (member: any) => {
        const lastAt = comment.lastIndexOf("@");
        setComment(`${comment.slice(0, lastAt)}@${member.user.firstName} ${member.user.lastName} `);
        setShowMentions(false);
        commentRef.current?.focus();
    };

    /* close drawer when viewport becomes desktop */
    useEffect(() => {
        const handler = () => { if (window.innerWidth >= 1024) setDrawerOpen(false); };
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    /* lock body scroll while drawer open */
    useEffect(() => {
        document.body.style.overflow = drawerOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [drawerOpen]);

    /* ════════════ LOADING ════════════ */
    if (taskLoading) return (
        <div className="w-full overflow-hidden p-4 sm:p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-3/4 rounded-xl" />
            <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
        </div>
    );

    /* ════════════ ERROR ════════════ */
    if (taskError || !task) return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <div>
                <h2 className="text-lg font-extrabold">{taskError ? "Failed to load task" : "Task not found"}</h2>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                    {taskError
                        ? taskErrorObj instanceof Error ? taskErrorObj.message : "An unexpected error occurred."
                        : "This task may have been deleted or you don't have access."}
                </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
                {taskError && <Button onClick={() => window.location.reload()}>Try Again</Button>}
                <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
            </div>
        </div>
    );

    /* ════════════════════════════════
       PROPERTIES PANEL (sidebar / drawer shared)
    ════════════════════════════════ */
    const PropertiesPanel = () => (
        <div className="space-y-5 pb-8">

            {/* Timer */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" /> Time Tracking
                    </span>
                    <span className={cn("text-xs font-bold tabular-nums truncate", isTracking ? "text-primary" : "text-muted-foreground")}>
                        {totalTracked > 0 ? formatDurationShort(totalTracked) : "0m"} tracked
                    </span>
                </div>
                <Button
                    size="sm"
                    variant={isTracking ? "destructive" : "default"}
                    className="h-9 w-full gap-2 text-xs font-bold"
                    onClick={() => isTracking ? stopTimer.mutate(task.id) : startTimer.mutate(task.id)}
                    disabled={startTimer.isPending || stopTimer.isPending}
                >
                    {isTracking
                        ? <><Square className="h-3.5 w-3.5 shrink-0" />Stop Timer</>
                        : <><Play className="h-3.5 w-3.5 shrink-0" />Start Timer</>}
                </Button>
            </div>

            <Divider />

            {/* Status */}
            <div>
                <FieldLabel>Status</FieldLabel>
                <Select value={task.status as string} onValueChange={(v) => updateTask.mutate({ status: v as any })}>
                    <SelectTrigger className="h-9 w-full rounded-xl border-border bg-muted/40 text-xs font-bold">
                        <div className="flex min-w-0 items-center gap-2">
                            <ColorDot className={TASK_STATUSES.find((s) => s.id === task.status)?.color} />
                            <span className="truncate"><SelectValue /></span>
                        </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        {TASK_STATUSES.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs font-bold">
                                <div className="flex items-center gap-2"><ColorDot className={s.color} />{s.label}</div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Priority */}
            <div>
                <FieldLabel>Priority</FieldLabel>
                <Select value={task.priority as string} onValueChange={(v) => updateTask.mutate({ priority: v as any })}>
                    <SelectTrigger className="h-9 w-full rounded-xl border-border bg-muted/40 text-xs font-bold">
                        <div className="flex min-w-0 items-center gap-2">
                            <ColorDot className={TASK_PRIORITIES.find((p) => p.id === task.priority)?.color} />
                            <span className="truncate"><SelectValue /></span>
                        </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        {TASK_PRIORITIES.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs font-bold">
                                <div className="flex items-center gap-2"><ColorDot className={p.color} />{p.label}</div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Divider />

            {/* People */}
            {(
                [
                    ["assigneeId", "Assignee", "Unassigned"],
                    ["reviewerId", "Reviewer", "None"],
                    ["testerId", "Tester", "None"],
                ] as [keyof Task, string, string][]
            ).map(([field, label, placeholder]) => {
                const uid = (task as any)[field] as string | undefined;
                const u = usersMap.get(uid || "");
                return (
                    <div key={field}>
                        <FieldLabel>{label}</FieldLabel>
                        <Select
                            value={uid ? String(uid) : "none"}
                            onValueChange={(v) => updateTask.mutate({ [field]: v === "none" ? null : v } as any)}
                        >
                            <SelectTrigger className="h-9 w-full rounded-xl border-border bg-muted/40 text-xs font-bold">
                                <div className="flex min-w-0 items-center gap-2">
                                    <Avatar className="h-5 w-5 shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-[8px] font-extrabold text-primary">
                                            {getInitials(u)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate">{u ? `${u.firstName} ${u.lastName}` : placeholder}</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="none" className="text-xs font-bold text-muted-foreground">{placeholder}</SelectItem>
                                {members?.filter((m) => m.user).map((m) => (
                                    <SelectItem key={m.user.id} value={String(m.user.id)} className="text-xs font-bold">
                                        {m.user.firstName} {m.user.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );
            })}

            {/* Role */}
            <div>
                <FieldLabel>Role</FieldLabel>
                <Select
                    value={task.deliveryRole || "none"}
                    onValueChange={(v) => updateTask.mutate({ deliveryRole: v === "none" ? null : v as any })}
                >
                    <SelectTrigger className="h-9 w-full rounded-xl border-border bg-muted/40 text-xs font-bold">
                        <span className="truncate"><SelectValue placeholder="None" /></span>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="none" className="text-xs font-bold text-muted-foreground">None</SelectItem>
                        {["Frontend", "Backend", "Fullstack", "Design", "QA", "Product", "DevOps"].map((r) => (
                            <SelectItem key={r} value={r} className="text-xs font-bold">{r}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Divider />

            {/* Dates */}
            {(
                [
                    ["startDate", "Start Date", "Set start date"],
                    ["dueDate", "Due Date", "Set due date"],
                ] as [keyof Task, string, string][]
            ).map(([field, label, placeholder]) => (
                <div key={field}>
                    <FieldLabel>{label}</FieldLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-9 w-full justify-start rounded-xl bg-muted/40 px-3 text-xs font-bold hover:bg-muted overflow-hidden"
                            >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">
                                    {(task as any)[field]
                                        ? format(new Date((task as any)[field]), "MMM d, yyyy")
                                        : <span className="font-normal text-muted-foreground">{placeholder}</span>}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto rounded-2xl p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={(task as any)[field] ? new Date((task as any)[field]) : undefined}
                                onSelect={(d) => updateTask.mutate({ [field]: d ? d.toISOString() : null } as any)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            ))}

            {/* Milestone */}
            <div>
                <FieldLabel>Milestone</FieldLabel>
                <Select
                    value={task.milestoneId || "none"}
                    onValueChange={(v) => updateTask.mutate({ milestoneId: v === "none" ? null : v })}
                >
                    <SelectTrigger className="h-9 w-full rounded-xl border-border bg-muted/40 text-xs font-bold">
                        <div className="flex min-w-0 items-center gap-2">
                            <Flag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{milestoneMeta?.title || "None"}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="none" className="text-xs font-bold text-muted-foreground">None</SelectItem>
                        {milestones?.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-xs font-bold">{m.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    /* ════════════════════════════════
       COMMENT TREE
    ════════════════════════════════ */

    const renderComments = (parentId: string | null = null, depth = 0): React.ReactNode =>
        commentMap.get(parentId)?.map((c) => (
            <div
                key={c.id}
                className={cn(
                    "flex flex-col gap-2",
                    depth > 0 && "ml-4 border-l border-border/40 pl-3 sm:ml-6 sm:pl-4"
                )}
            >
                <div className="group flex gap-2.5 sm:gap-3">
                    {/* Avatar */}
                    <Avatar className={cn(
                        "shrink-0 ring-2 ring-background",
                        depth === 0 ? "h-8 w-8 sm:h-9 sm:w-9" : "h-7 w-7"
                    )}>
                        <AvatarFallback className="bg-muted text-[9px] font-bold text-muted-foreground">
                            {getInitials(usersMap.get(c.authorId))}
                        </AvatarFallback>
                    </Avatar>

                    {/* Bubble — KEY FIX: min-w-0 + overflow-hidden so text wraps instead of pushing layout */}
                    <div className="min-w-0 flex-1 overflow-hidden space-y-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-xs font-bold text-foreground sm:text-sm">
                                {usersMap.get(c.authorId)
                                    ? `${usersMap.get(c.authorId).firstName} ${usersMap.get(c.authorId).lastName}`
                                    : "System User"}
                            </span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {c.createdAt ? format(new Date(c.createdAt), "MMM d · h:mm a") : ""}
                            </span>
                        </div>

                        {/* Content card */}
                        <div className="w-full rounded-2xl rounded-tl-none border border-border bg-card p-3 text-xs leading-relaxed text-foreground/80 shadow-sm sm:p-4 sm:text-sm break-words overflow-hidden">
                            {c.content}

                            {/* Reactions */}
                            {c.reactions && c.reactions.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1">
                                    {Object.entries(
                                        c.reactions.reduce((acc: Record<string, number>, r: string) => {
                                            const [emoji] = r.split(":");
                                            acc[emoji] = (acc[emoji] || 0) + 1;
                                            return acc;
                                        }, {})
                                    ).map(([emoji, count]) => {
                                        const mine = c.reactions?.some((r) => r === `${emoji}:${me?.id}`);
                                        return (
                                            <button
                                                key={emoji}
                                                onClick={() => toggleReaction.mutate({ commentId: c.id, emoji })}
                                                className={cn(
                                                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-all active:scale-95",
                                                    mine
                                                        ? "border-primary/20 bg-primary/10 text-primary"
                                                        : "border-border bg-muted/50 text-muted-foreground hover:border-primary/20"
                                                )}
                                            >
                                                <span>{emoji}</span><span>{count as number}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                                className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
                            >
                                {replyTo === c.id ? "Cancel" : "Reply"}
                            </button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground transition-all hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100">
                                        React
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="flex w-auto gap-1 rounded-full border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm"
                                    align="start"
                                >
                                    {["👍", "❤️", "🔥", "😂", "😮", "🚀"].map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => toggleReaction.mutate({ commentId: c.id, emoji })}
                                            className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all hover:scale-125 hover:bg-muted active:scale-95"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Inline reply */}
                        {replyTo === c.id && (
                            <div className="mt-2 flex items-start gap-2">
                                <Avatar className="mt-0.5 h-7 w-7 shrink-0">
                                    <AvatarFallback className="bg-primary/10 text-[8px] font-extrabold text-primary">
                                        {getInitials(me)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex min-w-0 flex-1 gap-2">
                                    <Input
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder={`Reply to ${usersMap.get(c.authorId)?.firstName || "user"}…`}
                                        className="h-9 min-w-0 flex-1 rounded-xl bg-muted/40 text-xs"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSendComment(c.id); }}
                                    />
                                    <Button
                                        size="sm"
                                        className="h-9 shrink-0 rounded-xl px-3"
                                        disabled={!comment.trim() || createComment.isPending}
                                        onClick={() => handleSendComment(c.id)}
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Nested replies */}
                {renderComments(c.id, depth + 1)}
            </div>
        ));

    /* ════════════════════════════════
       FULL RENDER
    ════════════════════════════════ */
    return (
        /*
          ROOT: full height, no overflow-x.
          overflow-x:hidden on the root prevents ANY child from
          creating horizontal scroll on the page.
        */
        <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">

            {/* ══════════ HEADER ══════════ */}
            <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background/90 backdrop-blur-md
        px-3 py-2.5
        sm:px-4 sm:py-3
        md:px-6
        lg:px-8">

                {/* Left: back + breadcrumb */}
                <div className="flex min-w-0 items-center gap-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.history.back()}
                        className="h-8 w-8 shrink-0 rounded-lg p-0 font-bold text-muted-foreground hover:text-foreground sm:w-auto sm:px-3"
                    >
                        <ChevronLeft className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline text-xs">Back</span>
                    </Button>

                    <span className="h-4 w-px shrink-0 bg-border" />

                    {/* Breadcrumb — each segment truncates independently */}
                    <nav className="flex min-w-0 items-center gap-0.5 text-[10px] font-bold sm:text-xs" aria-label="Breadcrumb">
                        <button
                            className="max-w-[60px] truncate text-muted-foreground transition-colors hover:text-primary sm:max-w-[100px] md:max-w-[150px]"
                            onClick={() => setLocation(`/projects/${project?.slug || project?.id || projectIdParam}`)}
                        >
                            {project?.name || "Project"}
                        </button>

                        {parentTask && (
                            <>
                                <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-40" />
                                <button
                                    className="hidden max-w-[70px] truncate text-muted-foreground transition-colors hover:text-primary sm:block md:max-w-[120px]"
                                    onClick={() => setLocation(`/projects/${project?.slug || project?.id || projectIdParam}/${parentTask.slug || parentTask.id}`)}
                                >
                                    {parentTask.title}
                                </button>
                                <ChevronRight className="hidden h-2.5 w-2.5 shrink-0 opacity-40 sm:block" />
                            </>
                        )}

                        <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-40" />
                        {/* Current task title in breadcrumb — longest but still truncated */}
                        <span className="max-w-[90px] truncate text-foreground sm:max-w-[180px] md:max-w-[260px] lg:max-w-[380px]">
                            {task.title}
                        </span>
                    </nav>
                </div>

                {/* Right: actions */}
                <div className="flex shrink-0 items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                        className="h-8 gap-1.5 rounded-lg border-border px-2 font-bold hover:bg-accent sm:px-3"
                    >
                        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline text-xs">Share</span>
                    </Button>

                    {/* Properties drawer toggle — hidden on lg+ */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-foreground lg:hidden"
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Open task properties"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg">
                            <DropdownMenuItem
                                className="gap-2 text-xs font-bold"
                                onClick={() => navigator.clipboard.writeText(task.id)}
                            >
                                <Copy className="h-3.5 w-3.5 opacity-50" /> Copy task ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="gap-2 text-xs font-bold text-destructive focus:text-destructive"
                                onClick={() => confirm("Delete this task?") && deleteTask.mutate()}
                            >
                                <Trash className="h-3.5 w-3.5 opacity-50" /> Delete task
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* ══════════ BODY ══════════ */}
            <div className="relative flex min-h-0 flex-1 overflow-hidden">

                {/*
          ScrollArea wraps the two-column layout.
          overflow-x is handled by the parent; this only scrolls vertically.
        */}
                <ScrollArea className="h-full w-full">
                    <div className="flex min-h-full w-full flex-col lg:flex-row">

                        {/* ── MAIN CONTENT ── */}
                        <main
                            className="
                /* CRITICAL: w-full + min-w-0 + overflow-hidden prevents content
                   from ever being wider than the viewport on mobile */
                w-full min-w-0 overflow-hidden
                flex-1
                space-y-6
                px-3 py-4
                sm:px-5 sm:py-6
                md:px-8 md:py-8
                lg:px-10 lg:py-10
                xl:px-12
              "
                        >
                            {/* Inner width cap — left-aligned on desktop */}
                            <div className="w-full max-w-full space-y-7 lg:max-w-[720px] xl:max-w-[800px]">

                                {/* ── Title ── */}
                                <div className="space-y-3">
                                    {isEditingTitle ? (
                                        <Input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onBlur={() => { updateTask.mutate({ title: editTitle }); setIsEditingTitle(false); }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") { updateTask.mutate({ title: editTitle }); setIsEditingTitle(false); }
                                                if (e.key === "Escape") { setEditTitle(task.title); setIsEditingTitle(false); }
                                            }}
                                            /* w-full so it never overflows */
                                            className="h-auto w-full rounded-xl py-2 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl md:text-3xl"
                                            autoFocus
                                        />
                                    ) : (
                                        <h1
                                            /*
                                              break-words: long single words wrap instead of overflowing.
                                              overflow-hidden: belt-and-suspenders guard.
                                              w-full: never wider than container.
                                            */
                                            className="w-full cursor-pointer break-words overflow-hidden rounded-xl px-1.5 py-1 -mx-1.5 text-xl font-extrabold leading-tight tracking-tight text-foreground transition-colors hover:bg-muted/50 sm:text-2xl md:text-3xl"
                                            onClick={() => setIsEditingTitle(true)}
                                            title="Click to edit"
                                        >
                                            {task.title}
                                        </h1>
                                    )}

                                    {/* Badges — wrap freely, never overflow */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {statusMeta && (
                                            <Badge variant="outline" className={cn("gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-tight sm:text-xs", statusMeta.color?.replace("bg-", "text-"))}>
                                                <ColorDot className={cn("h-1.5 w-1.5", statusMeta.color)} />
                                                {statusMeta.label}
                                            </Badge>
                                        )}
                                        {priorityMeta && (
                                            <Badge variant="outline" className={cn("gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-tight sm:text-xs", priorityMeta.color?.replace("bg-", "text-"))}>
                                                <ColorDot className={cn("h-1.5 w-1.5", priorityMeta.color)} />
                                                {priorityMeta.label}
                                            </Badge>
                                        )}
                                        {task.deliveryRole && (
                                            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-tight text-muted-foreground sm:text-xs">
                                                {task.deliveryRole}
                                            </Badge>
                                        )}
                                        {milestoneMeta && (
                                            <Badge className="gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-tight text-blue-600 dark:text-blue-400 sm:text-xs">
                                                <Flag className="h-2.5 w-2.5 shrink-0" />
                                                <span className="truncate max-w-[120px]">{milestoneMeta.title}</span>
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* ── Description ── */}
                                <section className="space-y-2.5">
                                    <SectionHeader icon={<Layout className="h-3.5 w-3.5" />} label="Description" />
                                    {/* w-full prevents textarea from breaking layout */}
                                    <Textarea
                                        placeholder="Add a description…"
                                        defaultValue={task.description || ""}
                                        onBlur={(e) =>
                                            e.target.value !== (task.description || "") &&
                                            updateTask.mutate({ description: e.target.value })
                                        }
                                        className="w-full min-h-[120px] resize-none rounded-2xl border-none bg-muted/40 p-4 text-xs leading-relaxed focus:ring-0 sm:min-h-[140px] sm:text-sm"
                                    />
                                </section>

                                {/* ── Subtasks ── */}
                                <section className="space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <SectionHeader icon={<ListTodo className="h-3.5 w-3.5" />} label="Subtasks" />
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setShowCreateSubtask(true)}
                                            className="h-7 shrink-0 gap-1 rounded-lg px-2 text-xs font-bold text-primary hover:bg-primary/10"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add</span>
                                        </Button>
                                    </div>

                                    {/* overflow-hidden prevents subtask rows from poking out */}
                                    <div className="w-full overflow-hidden rounded-2xl border border-border bg-muted/30">
                                        {subtasks?.tasks?.length ? (
                                            <div className="divide-y divide-border">
                                                {subtasks.tasks.map((s) => (
                                                    <div
                                                        key={s.id}
                                                        onClick={() =>
                                                            setLocation(
                                                                `/projects/${project?.slug || project?.id || projectIdParam}/${task.slug || task.id}/${s.slug || s.id}`
                                                            )
                                                        }
                                                        className="group flex cursor-pointer items-center justify-between gap-2 p-3 transition-colors hover:bg-card"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-2.5">
                                                            <ColorDot className={cn("h-2 w-2 shrink-0", TASK_STATUSES.find((st) => st.id === s.status)?.color || "bg-muted")} />
                                                            {/* truncate prevents long titles from overflowing */}
                                                            <span className="truncate text-xs font-semibold text-foreground transition-colors group-hover:text-primary sm:text-sm">
                                                                {s.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-2">
                                                            <span className="hidden text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:block">
                                                                {TASK_PRIORITIES.find((p) => p.id === s.priority)?.label}
                                                            </span>
                                                            {s.assigneeId && (
                                                                <Avatar className="h-6 w-6 shrink-0 border-2 border-background shadow-sm">
                                                                    <AvatarFallback className="bg-primary/10 text-[8px] font-extrabold text-primary">
                                                                        {getInitials(usersMap.get(s.assigneeId))}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                                                <CheckCircle2 className="h-8 w-8 opacity-20" />
                                                <p className="text-xs font-medium sm:text-sm">No subtasks yet</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* ── Attachments ── */}
                                <Divider />
                                {/* overflow-hidden guards TaskAttachments internals from breaking layout */}
                                <div className="w-full overflow-hidden">
                                    <TaskAttachments taskId={task.id!} />
                                </div>
                                <Divider />

                                {/* ── Activity / Comments ── */}
                                <section className="space-y-4 pb-4">
                                    <SectionHeader icon={<Clock className="h-3.5 w-3.5 opacity-60" />} label="Activity" />

                                    <div className="w-full space-y-4 overflow-hidden">
                                        {comments && comments.length > 0
                                            ? renderComments()
                                            : (
                                                <p className="py-6 text-center text-xs text-muted-foreground sm:text-sm">
                                                    No comments yet. Start the conversation!
                                                </p>
                                            )
                                        }
                                    </div>

                                    {/* Comment composer */}
                                    <div className="sticky bottom-0 border-t border-border bg-background/95 pt-3 pb-2 backdrop-blur-sm sm:pt-4">
                                        <div className="flex w-full gap-2 sm:gap-3">
                                            {/* Avatar hidden on very small screens to save space */}
                                            <Avatar className="mt-0.5 hidden shrink-0 ring-2 ring-background sm:flex h-9 w-9">
                                                <AvatarFallback className="bg-primary text-[9px] font-extrabold text-primary-foreground">
                                                    {getInitials(me)}
                                                </AvatarFallback>
                                            </Avatar>

                                            {/* Input wrapper — relative for mention dropdown positioning */}
                                            <div className="relative min-w-0 flex-1">
                                                {/* Mention dropdown */}
                                                {showMentions && filteredMentions.length > 0 && (
                                                    <div className="absolute bottom-full left-0 z-50 mb-2 w-52 overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:w-64">
                                                        <div className="border-b border-border bg-muted/50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                                                            Mention
                                                        </div>
                                                        <div className="max-h-36 overflow-y-auto p-1">
                                                            {filteredMentions.map((m, i) => (
                                                                <button
                                                                    key={m.userId}
                                                                    onClick={() => handleSelectMention(m)}
                                                                    className={cn(
                                                                        "flex w-full items-center gap-2 rounded-xl p-2 text-left text-xs font-bold transition-colors",
                                                                        mentionIndex === i
                                                                            ? "bg-primary text-primary-foreground"
                                                                            : "text-foreground hover:bg-primary hover:text-primary-foreground"
                                                                    )}
                                                                >
                                                                    <Avatar className="h-6 w-6 shrink-0">
                                                                        <AvatarFallback className="text-[8px] font-extrabold">{getInitials(m.user)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="truncate">{m.user.firstName} {m.user.lastName}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex w-full gap-2">
                                                    <Textarea
                                                        ref={commentRef}
                                                        value={comment}
                                                        onChange={handleCommentInput}
                                                        onKeyDown={handleCommentKeyDown}
                                                        placeholder="Write a comment… Use @ to mention"
                                                        className="min-h-[76px] flex-1 resize-none rounded-2xl border-border bg-muted/40 p-3 text-xs leading-relaxed transition-all focus:bg-background focus:ring-2 focus:ring-primary/20 sm:min-h-[96px] sm:p-4 sm:text-sm"
                                                    />
                                                    <Button
                                                        disabled={!comment.trim() || createComment.isPending}
                                                        onClick={() => handleSendComment()}
                                                        className="w-10 shrink-0 self-stretch rounded-2xl bg-primary transition-all hover:bg-primary/90 active:scale-95 sm:w-12"
                                                    >
                                                        <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                            </div>{/* /inner max-width */}
                        </main>

                        {/* ── DESKTOP SIDEBAR (lg+) ── */}
                        <aside className="hidden w-60 shrink-0 border-l border-border bg-background lg:block xl:w-72 2xl:w-80">
                            <div className="sticky top-0 h-[calc(100vh-57px)] overflow-y-auto p-4 xl:p-5">
                                <PropertiesPanel />
                            </div>
                        </aside>

                    </div>
                </ScrollArea>

                {/* ══════════════════════════════
            MOBILE / TABLET PROPERTIES DRAWER
        ══════════════════════════════ */}

                {/* Backdrop */}
                <div
                    aria-hidden="true"
                    className={cn(
                        "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
                        drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
                    )}
                    onClick={() => setDrawerOpen(false)}
                />

                {/* Drawer panel */}
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Task properties"
                    className={cn(
                        "fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
                        /*
                          Width strategy:
                          - Below 360 px: full viewport width (no cropping)
                          - 360–639 px: fixed 320 px
                          - 640–1023 px: fixed 380 px
                        */
                        "w-full max-w-full sm:w-80 md:w-96",
                        drawerOpen ? "translate-x-0" : "translate-x-full"
                    )}
                >
                    {/* Drawer header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                            <h2 className="text-sm font-extrabold uppercase tracking-widest text-foreground">Properties</h2>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground"
                            onClick={() => setDrawerOpen(false)}
                            aria-label="Close properties"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Drawer scrollable body */}
                    <ScrollArea className="flex-1">
                        <div className="p-4 sm:p-5">
                            <PropertiesPanel />
                        </div>
                    </ScrollArea>
                </div>

            </div>{/* /body */}

            {/* Create subtask dialog */}
            <CreateTaskDialog
                open={showCreateSubtask}
                onClose={() => setShowCreateSubtask(false)}
                projectId={task.projectId}
                parentId={task.id}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
                    setShowCreateSubtask(false);
                }}
                projects={project ? [project] : []}
                members={members?.map((m) => m.user).filter(Boolean)}
            />
        </div>
    );
}
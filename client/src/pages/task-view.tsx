import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Calendar as CalendarIcon,
    Clock,
    CheckCircle2,
    AlertCircle,
    User as UserIcon,
    Send,
    Paperclip,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Layout,
    ListTodo,
    Share2,
    Copy,
    Trash,
    Plus,
    Flag
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Task, Comment, TimeLog, Milestone } from "@shared/schema";
import type { User } from "@shared/models/auth";
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
    DropdownMenuLabel,
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
    const Icon = s.icon;
    return <Icon className={cn("h-3.5 w-3.5", s.color)} />;
};

export default function TaskView() {
    const [matchTask, paramsTask] = useRoute("/tasks/:id");
    const [matchProjectTask, paramsProjectTask] = useRoute("/projects/:projectId/:taskId");
    const [matchSubTask, paramsSubTask] = useRoute("/projects/:projectId/:parentTaskId/:taskId");
    const taskId = paramsTask?.id || paramsProjectTask?.taskId || paramsSubTask?.taskId;
    const projectIdParam = paramsProjectTask?.projectId || paramsSubTask?.projectId;
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();

    const [comment, setComment] = useState("");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState("");
    const [showCreateSubtask, setShowCreateSubtask] = useState(false);

    // Mentions state
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

    // Fetch Task
    const { data: task, isLoading: taskLoading } = useQuery<Task>({
        queryKey: [`/api/tasks/${taskId}`],
        enabled: !!taskId,
    });

    // Fetch Project
    const { data: project } = useQuery<any>({
        queryKey: [`/api/projects/${task?.projectId || projectIdParam}`],
        enabled: !!(task?.projectId || projectIdParam),
    });

    // Fetch Parent Task if this is a subtask
    const { data: parentTask } = useQuery<Task>({
        queryKey: [`/api/tasks/${task?.parentId}`],
        enabled: !!task?.parentId,
    });

    const { data: members } = useQuery<any[]>({
        queryKey: [`/api/projects/${task?.projectId || projectIdParam}/members`],
        enabled: !!(task?.projectId || projectIdParam),
    });

    // Fetch Subtasks
    const { data: subtasks } = useQuery<{ tasks: Task[] }>({
        queryKey: ["/api/tasks/search", task?.projectId, { parentId: task?.id }],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/search?projectId=${task?.projectId}&parentId=${task?.id}`);
            if (!res.ok) throw new Error("Failed to fetch subtasks");
            return res.json();
        },
        enabled: !!task?.id && !!task?.projectId,
    });

    // Fetch Comments
    const { data: comments } = useQuery<Comment[]>({
        queryKey: [`/api/tasks/${task?.id}/comments`],
        enabled: !!task?.id,
    });

    // Fetch organization members for mentions
    const { data: orgMembers } = useQuery<any[]>({
        queryKey: [`/api/organizations/members`],
        enabled: !!project?.organizationId,
    });

    // Fetch Milestones
    const { data: milestones } = useQuery<Milestone[]>({
        queryKey: [`/api/organizations/${project?.organizationId}/milestones`],
        enabled: !!project?.organizationId,
    });

    const usersMap = useMemo(() => {
        const map = new Map<string, any>();
        orgMembers?.forEach(m => map.set(m.userId, m.user));
        members?.forEach(m => { if (!map.has(m.userId)) map.set(m.userId, m.user); });
        return map;
    }, [orgMembers, members]);

    const status = useMemo(() => TASK_STATUSES.find(s => s.id === task?.status), [task?.status]);
    const priority = useMemo(() => TASK_PRIORITIES.find(p => p.id === task?.priority), [task?.priority]);
    const milestone = useMemo(() => milestones?.find(m => m.id === task?.milestoneId), [milestones, task?.milestoneId]);

    useEffect(() => {
        if (task) setTitle(task.title);
    }, [task]);

    // Mutations
    const updateTaskMutation = useMutation({
        mutationFn: async (updates: Partial<Task>) => {
            const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to update task");
            }
            return res.json();
        },
        onSuccess: (updatedTask: Task) => {
            // Invalidate the current task query (by slug/param ID)
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });

            // Also invalidate by its actual ID to ensure any component using the ID stays in sync
            if (updatedTask.id !== taskId) {
                queryClient.invalidateQueries({ queryKey: [`/api/tasks/${updatedTask.id}`] });
            }

            // Invalidate relevant list queries
            queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
            queryClient.invalidateQueries({ queryKey: ["/api/tasks/recent"] });
            if (updatedTask.projectId) {
                queryClient.invalidateQueries({ queryKey: ["/api/tasks/search", updatedTask.projectId] });
                queryClient.invalidateQueries({ queryKey: [`/api/projects/${updatedTask.projectId}/tasks`] });
            }

            toast({ title: "Task updated" });
        },
        onError: (error: Error) => {
            toast({
                title: "Update failed",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const createCommentMutation = useMutation({
        mutationFn: async ({ content, mentions }: { content: string; mentions: string[] }) => {
            const res = await apiRequest("POST", `/api/tasks/${task?.id}/comments`, { content, mentions });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/comments`] });
            setComment("");
            toast({ title: "Comment added" });
        },
    });

    const handleSendComment = () => {
        if (!comment.trim() || !task) return;
        const mentionMatches = comment.match(/@([a-zA-Z]+\s[a-zA-Z]+)/g) || [];
        const mentions: string[] = [];
        mentionMatches.forEach(match => {
            const name = match.substring(1);
            const member = (orgMembers || members)?.find(m => `${m.user.firstName} ${m.user.lastName}` === name);
            if (member) mentions.push(member.userId);
        });
        createCommentMutation.mutate({ content: comment, mentions });
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const cursorPosition = e.target.selectionStart || 0;
        const textBeforeCursor = val.slice(0, cursorPosition);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
        setComment(val);
        if (mentionMatch) {
            setShowMentions(true);
            setMentionQuery(mentionMatch[1].toLowerCase());
            setSelectedMentionIndex(0);
        } else {
            setShowMentions(false);
        }
    };

    const handleSelectMention = (member: any) => {
        const lastAtIndex = comment.lastIndexOf("@");
        const newComment = comment.slice(0, lastAtIndex) + `@${member.user.firstName} ${member.user.lastName} ` + comment.slice(comment.length);
        setComment(newComment);
        setShowMentions(false);
    };

    const filteredMentions = (orgMembers || members)?.filter(m =>
        `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(mentionQuery)
    ) || [];

    const deleteTaskMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("DELETE", `/api/tasks/${task?.id}`);
        },
        onSuccess: () => {
            toast({ title: "Task deleted" });
            setLocation("/tasks");
        },
    });

    const handleShare = () => {
        if (!task) return;
        navigator.clipboard.writeText(`${window.location.origin}/tasks/${task.slug || task.id}`);
        toast({ title: "Link copied to clipboard" });
    };

    if (taskLoading) return (
        <div className="p-8 space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <div className="flex gap-8">
                <Skeleton className="h-[600px] flex-1" />
                <Skeleton className="h-[600px] w-80" />
            </div>
        </div>
    );
    if (!task) return <div className="p-8 text-center font-bold">Task not found</div>;

    const initials = (u: any) => u ? ((u.firstName?.[0] || "") + (u.lastName?.[0] || "")).toUpperCase() : "?";

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="h-8 text-slate-400 hover:text-[#020617] font-bold px-2">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                    </Button>
                    <div className="h-4 w-px bg-slate-100" />
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span className="hover:text-violet-600 cursor-pointer transition-colors" onClick={() => setLocation(`/projects/${project?.slug || project?.id || projectIdParam}`)}>
                            {project?.name || (projectIdParam ? projectIdParam.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "Project")}
                        </span>
                        <ChevronRight className="h-2.5 w-2.5 opacity-50" />
                        {parentTask && (
                            <>
                                <span className="hover:text-violet-600 cursor-pointer transition-colors" onClick={() => setLocation(`/projects/${project?.slug || project?.id || projectIdParam}/${parentTask.slug || parentTask.id}`)}>{parentTask.title}</span>
                                <ChevronRight className="h-2.5 w-2.5 opacity-50" />
                            </>
                        )}
                        <span className="text-slate-600 truncate max-w-[200px]">{task.title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleShare} className="h-8 rounded-lg border-slate-200 text-slate-600 font-bold gap-2 hover:bg-slate-50">
                        <Share2 className="h-3.5 w-3.5 text-slate-400" /> Share
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-100 shadow-elevation">
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(task.id)} className="font-bold text-xs text-slate-600">
                                <Copy className="h-3.5 w-3.5 mr-2 opacity-50" /> Copy ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 font-bold text-xs" onClick={() => confirm("Delete this task?") && deleteTaskMutation.mutate()}>
                                <Trash className="h-3.5 w-3.5 mr-2 opacity-50" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}
                <ScrollArea className="flex-1 bg-white">
                    <div className="p-10 max-w-4xl mx-auto space-y-10 animate-fade-in">
                        {/* Title & Badges */}
                        <div className="space-y-6">
                            {isEditingTitle ? (
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => { updateTaskMutation.mutate({ title }); setIsEditingTitle(false); }}
                                    onKeyDown={(e) => e.key === "Enter" && (updateTaskMutation.mutate({ title }), setIsEditingTitle(false))}
                                    className="text-4xl font-extrabold h-auto py-3 bg-slate-50 border-violet-100 focus:ring-4 focus:ring-violet-50 rounded-xl"
                                    autoFocus
                                />
                            ) : (
                                <h1
                                    className="text-4xl font-extrabold text-[#020617] tracking-tight leading-tight hover:bg-slate-50 rounded-xl px-2 -mx-2 cursor-pointer transition-all underline-offset-8"
                                    onClick={() => setIsEditingTitle(true)}
                                >
                                    {task.title}
                                </h1>
                            )}

                            <div className="flex flex-wrap items-center gap-2 mb-8 animate-fade-up" style={{ animationDelay: '100ms' }}>
                                <Badge variant="outline" className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border-slate-200/60 bg-white/50 backdrop-blur-sm shadow-sm transition-all", status?.color?.replace("bg-", "text-"))}>
                                    <div className={cn("h-2 w-2 rounded-full", status?.color)} />
                                    <span className="text-xs font-bold tracking-tight uppercase leading-none">{status?.label || task.status}</span>
                                </Badge>
                                <Badge variant="outline" className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border-slate-200/60 bg-white/50 backdrop-blur-sm shadow-sm transition-all", priority?.color?.replace("bg-", "text-"))}>
                                    <div className={cn("h-2 w-2 rounded-full", priority?.color)} />
                                    <span className="text-xs font-bold tracking-tight uppercase leading-none">{priority?.label}</span>
                                </Badge>
                                {task.deliveryRole && (
                                    <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-slate-200/60 bg-white text-slate-500 text-xs font-bold tracking-tight uppercase leading-none shadow-sm">
                                        {task.deliveryRole}
                                    </Badge>
                                )}
                                {milestone && (
                                    <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-blue-100 bg-blue-50/50 text-blue-600 text-xs font-bold tracking-tight uppercase leading-none shadow-sm">
                                        {milestone.title}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Description Section */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Layout className="h-3.5 w-3.5" /> Description
                            </h3>
                            <Textarea
                                placeholder="Write something about this task..."
                                className="min-h-[160px] text-slate-700 leading-relaxed bg-slate-50 border-none focus:ring-0 resize-none rounded-2xl p-6 text-base"
                                defaultValue={task.description || ""}
                                onBlur={(e) => e.target.value !== (task.description || "") && updateTaskMutation.mutate({ description: e.target.value })}
                            />
                        </section>

                        {/* Subtasks Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <ListTodo className="h-3.5 w-3.5" /> Subtasks
                                </h3>
                                <Button size="sm" variant="ghost" onClick={() => setShowCreateSubtask(true)} className="h-8 text-violet-600 font-bold hover:bg-violet-50">
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                                </Button>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-1 border border-slate-100">
                                {subtasks?.tasks?.length ? (
                                    <div className="space-y-1">
                                        {subtasks.tasks.map(s => (
                                            <div key={s.id} onClick={() => setLocation(`/projects/${project?.slug || project?.id || projectIdParam}/${task.slug || task.id}/${s.slug || s.id}`)} className="flex items-center justify-between p-3 rounded-xl hover:bg-white hover:shadow-sm cursor-pointer transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-2 h-2 rounded-full", TASK_STATUSES.find(st => st.id === s.status)?.color || "bg-slate-300")} />
                                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-violet-600">{s.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{TASK_PRIORITIES.find(p => p.id === s.priority)?.label}</span>
                                                    {s.assigneeId && (
                                                        <Avatar className="h-6 w-6 border-2 border-white shadow-sm">
                                                            <AvatarFallback className="text-[8px] bg-violet-100 text-violet-600 font-bold">{initials(usersMap.get(s.assigneeId))}</AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center text-slate-400 text-sm font-medium">No subtasks created for this task.</div>
                                )}
                            </div>
                        </section>

                        <div className="h-px bg-slate-100" />
                        <TaskAttachments taskId={task.id!} />
                        <div className="h-px bg-slate-100" />

                        {/* Comments / Activity feed */}
                        <section className="space-y-6 pt-6 animate-fade-up">
                            <div className="flex items-center gap-2 px-1">
                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 opacity-50" /> Activity Feed
                                </h3>
                                <div className="h-px flex-1 bg-slate-50" />
                            </div>

                            <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-50">
                                {comments?.map((c) => (
                                    <div key={c.id} className="flex gap-4 group relative">
                                        <div className="relative z-10 shrink-0">
                                            <Avatar className="h-10 w-10 ring-4 ring-white shadow-premium">
                                                <AvatarFallback className="bg-slate-50 text-slate-400 font-bold text-xs">{initials(usersMap.get(c.authorId))}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="flex-1 space-y-1.5 min-w-0">
                                            <div className="flex items-center gap-2 px-0.5">
                                                <span className="text-sm font-bold text-slate-900 truncate">
                                                    {usersMap.get(c.authorId) ? `${usersMap.get(c.authorId).firstName} ${usersMap.get(c.authorId).lastName}` : "System User"}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                                                    {c.createdAt ? format(new Date(c.createdAt), "h:mm a") : ""}
                                                </span>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl rounded-tl-none text-sm text-slate-600 leading-relaxed border border-slate-100 shadow-sm transition-all group-hover:shadow-md group-hover:border-slate-200">
                                                {c.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white/95 backdrop-blur-sm py-4 border-t border-slate-100">
                                    <div className="shrink-0">
                                        <Avatar className="h-10 w-10 shadow-premium ring-2 ring-white">
                                            <AvatarFallback className="bg-violet-600 text-white font-extrabold text-xs">{initials(currentUser)}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2 relative min-w-0">
                                        {showMentions && filteredMentions.length > 0 && (
                                            <div className="absolute bottom-full left-0 w-64 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-premium mb-2 overflow-hidden z-50 animate-pop-in border-slate-200/50">
                                                <div className="p-3 bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Mention member</div>
                                                <ScrollArea className="max-h-48 p-1">
                                                    {filteredMentions.map((m, i) => (
                                                        <button key={m.userId} onClick={() => handleSelectMention(m)} className={cn("w-full flex items-center gap-2 p-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-violet-600 hover:text-white transition-all", selectedMentionIndex === i && "bg-violet-600 text-white")}>
                                                            <Avatar className="h-6 w-6 ring-1 ring-white/20"><AvatarFallback className="text-[8px] font-extrabold">{initials(m.user)}</AvatarFallback></Avatar>
                                                            {m.user.firstName} {m.user.lastName}
                                                        </button>
                                                    ))}
                                                </ScrollArea>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <Textarea value={comment} onChange={handleCommentChange} placeholder="Write a comment... Use @ to mention" className="min-h-[100px] bg-slate-50/50 border-slate-100 focus:bg-white focus:border-violet-100 focus:ring-4 focus:ring-violet-50/50 rounded-2xl p-4 text-sm resize-none transition-all" />
                                            <Button disabled={!comment.trim() || createCommentMutation.isPending} onClick={handleSendComment} className="h-[100px] w-14 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200 transition-all hover:scale-105 active:scale-95">
                                                <Send className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </ScrollArea>

                {/* Sticky Sidebar */}
                <aside className="w-80 border-l border-slate-100 bg-white p-6 space-y-8 overflow-y-auto shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Current Status</label>
                            <Select value={task?.status as any} onValueChange={(val) => updateTaskMutation.mutate({ status: val as any })}>
                                <SelectTrigger className="h-10 rounded-xl border-slate-100 bg-slate-50 font-bold text-xs text-slate-700 focus:ring-4 focus:ring-violet-50">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", TASK_STATUSES.find(s => s.id === task.status)?.color)} />
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-elevation">
                                    {TASK_STATUSES.map(s => (
                                        <SelectItem key={s.id} value={s.id} className="font-bold text-xs text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", s.color)} />
                                                {s.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Priority Level</label>
                            <Select value={task?.priority as any} onValueChange={(val) => updateTaskMutation.mutate({ priority: val as any })}>
                                <SelectTrigger className="h-10 rounded-xl border-slate-100 bg-slate-50 font-bold text-xs text-slate-700 focus:ring-4 focus:ring-violet-50">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", TASK_PRIORITIES.find(p => p.id === task.priority)?.color)} />
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-elevation">
                                    {TASK_PRIORITIES.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="font-bold text-xs text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", p.color)} />
                                                {p.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="h-px bg-slate-50" />

                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Assignee</label>
                                <Select value={task?.assigneeId ? String(task.assigneeId) : "unassigned"} onValueChange={(v) => updateTaskMutation.mutate({ assigneeId: v === "unassigned" ? null : v as any })}>
                                    <SelectTrigger className="h-10 border-slate-100 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors ring-offset-0 focus:ring-4 focus:ring-violet-50">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6 ring-2 ring-white shadow-sm"><AvatarFallback className="text-[8px] font-extrabold bg-violet-100 text-violet-600">{initials(usersMap.get(task.assigneeId as any))}</AvatarFallback></Avatar>
                                            <span className="text-xs font-bold text-slate-700">{usersMap.get(task.assigneeId as any) ? `${usersMap.get(task.assigneeId as any).firstName} ${usersMap.get(task.assigneeId as any).lastName}` : "Unassigned"}</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-elevation">
                                        <SelectItem value="unassigned" className="text-slate-400 font-bold text-xs">Unassigned</SelectItem>
                                        {members?.map(m => <SelectItem key={m.user.id} value={String(m.user.id)} className="font-bold text-xs text-slate-700">{m.user.firstName} {m.user.lastName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Reviewer</label>
                                <Select value={task?.reviewerId ? String(task.reviewerId) : "unassigned"} onValueChange={(v) => updateTaskMutation.mutate({ reviewerId: v === "unassigned" ? null : v as any })}>
                                    <SelectTrigger className="h-10 border-slate-100 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors ring-offset-0 focus:ring-4 focus:ring-violet-50">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6 ring-2 ring-white shadow-sm"><AvatarFallback className="text-[8px] font-extrabold bg-slate-100 text-slate-500">{initials(usersMap.get(task.reviewerId as any))}</AvatarFallback></Avatar>
                                            <span className="text-xs font-bold text-slate-500">{usersMap.get(task.reviewerId as any) ? `${usersMap.get(task.reviewerId as any).firstName} ${usersMap.get(task.reviewerId as any).lastName}` : "None"}</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-elevation">
                                        <SelectItem value="unassigned" className="font-bold text-xs text-slate-400">None</SelectItem>
                                        {members?.map(m => <SelectItem key={m.user.id} value={String(m.user.id)} className="font-bold text-xs text-slate-700">{m.user.firstName} {m.user.lastName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="h-px bg-slate-50" />

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Due Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" className="w-full justify-start h-10 font-bold text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl px-3 transition-colors">
                                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                            {task?.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : <span className="text-slate-400">Set due date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-slate-100 rounded-2xl shadow-elevation" align="start">
                                        <Calendar mode="single" selected={task?.dueDate ? new Date(task.dueDate) : undefined} onSelect={(d) => updateTaskMutation.mutate({ dueDate: (d ? d.toISOString() : null) as any })} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Milestone</label>
                                <Select value={task?.milestoneId || "no-milestone"} onValueChange={(v) => updateTaskMutation.mutate({ milestoneId: v === "no-milestone" ? null : v })}>
                                    <SelectTrigger className="h-10 border-slate-100 bg-slate-50 hover:bg-slate-100 rounded-xl px-3 ring-offset-0 focus:ring-4 focus:ring-violet-50">
                                        <div className="flex items-center gap-2">
                                            <Flag className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-600 truncate">{milestones?.find(m => m.id === task.milestoneId)?.title || "None"}</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-elevation">
                                        <SelectItem value="no-milestone" className="font-bold text-xs text-slate-400">None</SelectItem>
                                        {milestones?.map(m => <SelectItem key={m.id} value={m.id} className="font-bold text-xs text-slate-700">{m.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <CreateTaskDialog open={showCreateSubtask} onClose={() => setShowCreateSubtask(false)} projectId={task.projectId} parentId={task.id} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] }); setShowCreateSubtask(false); }} projects={[project]} members={members?.map(m => m.user).filter(Boolean)} />
        </div>
    );
}


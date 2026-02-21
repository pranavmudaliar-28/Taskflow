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
    Layout,
    ListTodo,
    Share2,
    Copy,
    Trash
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Task, Comment, TimeLog, User } from "@shared/schema";
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
import { TaskTable } from "@/components/task-table";
import { TaskAttachments } from "@/components/task-attachments";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import type { Milestone } from "@shared/schema";

export default function TaskView() {
    const [match, params] = useRoute("/tasks/:id");
    const taskId = params?.id;
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

    // Fetch Project to get Members (Mocking organization members for now)
    const { data: project } = useQuery<any>({
        queryKey: [`/api/projects/${task?.projectId}`],
        enabled: !!task?.projectId,
    });

    const { data: members } = useQuery<any[]>({
        queryKey: [`/api/projects/${task?.projectId}/members`],
        enabled: !!task?.projectId,
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

    // Fetch Milestones for the organization
    const { data: milestones } = useQuery<Milestone[]>({
        queryKey: [`/api/organizations/${project?.organizationId}/milestones`],
        enabled: !!project?.organizationId,
    });

    // Users map for resolving names (using org members as it's more comprehensive)
    const usersMap = useMemo(() => {
        const map = new Map<string, any>();
        orgMembers?.forEach(m => map.set(m.userId, m.user));
        // Fallback to project members if org members haven't loaded yet or are different
        members?.forEach(m => {
            if (!map.has(m.userId)) {
                map.set(m.userId, m.user);
            }
        });
        return map;
    }, [orgMembers, members]);

    useEffect(() => {
        if (task) setTitle(task.title);
    }, [task]);

    // Mutations
    const updateTaskMutation = useMutation({
        mutationFn: async (updates: Partial<Task>) => {
            const res = await apiRequest("PATCH", `/api/tasks/${task?.id}`, updates);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}`] });
            toast({ title: "Task updated" });
        },
    });

    const createCommentMutation = useMutation({
        mutationFn: async ({ content, mentions }: { content: string; mentions: string[] }) => {
            const res = await apiRequest("POST", `/api/tasks/${task?.id}/comments`, { content, mentions });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/comments`] });
            setComment("");
        },
    });

    const handleSendComment = () => {
        if (!comment.trim() || !task) return;

        // Extract mentions from text (e.g. @FirstName LastName)
        const mentionMatches = comment.match(/@([a-zA-Z]+\s[a-zA-Z]+)/g) || [];
        const mentions: string[] = [];

        mentionMatches.forEach(match => {
            const name = match.substring(1);
            // Search in both org members and project members
            const member = (orgMembers || members)?.find(m => `${m.user.firstName} ${m.user.lastName}` === name);
            if (member) {
                mentions.push(member.userId);
            }
        });

        createCommentMutation.mutate({ content: comment, mentions });
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const lastChar = val.slice(-1);
        const cursorPosition = e.target.selectionStart;
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
        const cursorPosition = comment.length; // Simplified for now
        const textBeforeMention = comment.slice(0, comment.lastIndexOf("@"));
        const newComment = textBeforeMention + `@${member.user.firstName} ${member.user.lastName} ` + comment.slice(cursorPosition);
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
        onError: () => {
            toast({ title: "Failed to delete task", variant: "destructive" });
        }
    });

    const handleShare = () => {
        if (!task) return;
        const url = `${window.location.origin}/tasks/${task.slug || task.id}`;
        navigator.clipboard.writeText(url);
        toast({
            title: "Link copied",
            description: "Task URL has been copied to clipboard.",
        });
    };

    if (taskLoading) return <div className="p-8">Loading task...</div>;
    if (!task) return <div className="p-8">Task not found</div>;



    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Layout className="h-4 w-4" />
                        <span>{project?.name || "Project"}</span>
                        <span>/</span>
                        <span>{task.title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                        <Share2 className="h-4 w-4" />
                        Share
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Task Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(task.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Task ID
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleShare}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Copy Task Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                    if (confirm("Are you sure you want to delete this task?")) {
                                        deleteTaskMutation.mutate();
                                    }
                                }}
                            >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete Task
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content */}
                <ScrollArea className="flex-1">
                    <div className="p-8 max-w-4xl mx-auto space-y-8">
                        {/* Title Section */}
                        <div className="space-y-4">
                            {isEditingTitle ? (
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => {
                                        updateTaskMutation.mutate({ title });
                                        setIsEditingTitle(false);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            updateTaskMutation.mutate({ title });
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                    className="text-3xl font-bold h-auto py-2"
                                    autoFocus
                                />
                            ) : (
                                <h1
                                    className="text-3xl font-bold hover:bg-muted/50 rounded px-2 -mx-2 cursor-pointer transition-colors"
                                    onClick={() => setIsEditingTitle(true)}
                                >
                                    {task.title}
                                </h1>
                            )}

                            <div className="flex flex-wrap gap-4">
                                <Badge variant="outline" className={cn(
                                    "capitalize",
                                    TASK_STATUSES.find(s => s.id === task.status)?.color
                                )}>
                                    {TASK_STATUSES.find(s => s.id === task.status)?.label}
                                </Badge>
                                <Badge variant="outline" className={cn(
                                    "capitalize",
                                    TASK_PRIORITIES.find(p => p.id === task.priority)?.color
                                )}>
                                    {TASK_PRIORITIES.find(p => p.id === task.priority)?.label}
                                </Badge>
                                {task.assigneeId && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <UserIcon className="h-4 w-4" />
                                        <span>{usersMap.get(task.assigneeId)?.firstName || "Assignee"}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Description</h3>
                            <Textarea
                                placeholder="Add a description..."
                                className="min-h-[150px] resize-none"
                                defaultValue={task.description || ""}
                                onBlur={(e) => {
                                    if (e.target.value !== (task.description || "")) {
                                        updateTaskMutation.mutate({ description: e.target.value });
                                    }
                                }}
                            />
                        </div>

                        {/* Subtasks */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <ListTodo className="h-5 w-5" />
                                    Subtasks
                                </h3>
                                <Button size="sm" variant="outline" onClick={() => setShowCreateSubtask(true)}>Add Subtask</Button>
                            </div>
                            {subtasks?.tasks?.length ? (
                                <div className="space-y-2">
                                    {subtasks.tasks.map(subtask => (
                                        <div
                                            key={subtask.id}
                                            className="flex items-center justify-between p-3 border rounded-md bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors"
                                            onClick={() => setLocation(`/tasks/${subtask.slug || subtask.id}`)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-2 h-2 rounded-full", TASK_STATUSES.find(s => s.id === subtask.status)?.color || "bg-gray-400")} />
                                                <span className="text-sm font-medium">{subtask.title}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="text-[10px] h-5 capitalize">
                                                    {TASK_PRIORITIES.find(p => p.id === subtask.priority)?.label}
                                                </Badge>
                                                {subtask.assigneeId && (
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={usersMap.get(subtask.assigneeId)?.profileImageUrl || undefined} />
                                                        <AvatarFallback className="text-[10px]">
                                                            {(() => {
                                                                const user = usersMap.get(subtask.assigneeId);
                                                                return user ? ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || "?" : "?";
                                                            })()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-md border border-dashed">
                                    No subtasks yet
                                </div>
                            )}
                        </div>

                        <Separator className="my-8" />
                        <TaskAttachments taskId={task.id!} />
                        <Separator className="my-8" />

                        {/* Activity / Comments */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Activity</h3>
                            <div className="space-y-4">
                                {comments?.map((comment) => {
                                    const author = usersMap.get(comment.authorId);
                                    const authorName = author ? `${author.firstName} ${author.lastName}` : `User ${comment.authorId}`;
                                    const initials = author ? ((author.firstName?.[0] || "") + (author.lastName?.[0] || "")).toUpperCase() : "?";

                                    return (
                                        <div key={comment.id} className="flex gap-4">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={author?.profileImageUrl || undefined} />
                                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-sm">{authorName}</span>
                                                    <span className="text-xs text-muted-foreground">{comment.createdAt ? format(new Date(comment.createdAt), "MMM d, h:mm a") : ""}</span>
                                                </div>
                                                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                                    {comment.content.split(/(@[a-zA-Z]+\s[a-zA-Z]+)/).map((part, i) => (
                                                        part.startsWith("@") ? (
                                                            <span key={i} className="text-primary font-semibold">
                                                                {part}
                                                            </span>
                                                        ) : (
                                                            <span key={i}>{part}</span>
                                                        )
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="flex gap-4 pt-4">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={currentUser?.profileImageUrl || undefined} />
                                        <AvatarFallback className="text-xs">
                                            {currentUser ? ((currentUser.firstName?.[0] || "") + (currentUser.lastName?.[0] || "")).toUpperCase() : "Me"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 flex flex-col gap-2 relative">
                                        {showMentions && filteredMentions.length > 0 && (
                                            <div className="absolute bottom-full left-0 w-64 bg-popover border rounded-md shadow-lg mb-2 overflow-hidden z-50">
                                                <div className="p-2 border-b bg-muted/50">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase">Mention Member</span>
                                                </div>
                                                <ScrollArea className="max-h-48">
                                                    <div className="p-1">
                                                        {filteredMentions.map((m, i) => (
                                                            <button
                                                                key={m.userId}
                                                                onClick={() => handleSelectMention(m)}
                                                                className={cn(
                                                                    "w-full flex items-center gap-2 p-2 text-sm rounded-sm hover:bg-accent transition-colors",
                                                                    selectedMentionIndex === i && "bg-accent"
                                                                )}
                                                            >
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={m.user.profileImageUrl || undefined} />
                                                                    <AvatarFallback className="text-[10px]">
                                                                        {((m.user.firstName?.[0] || "") + (m.user.lastName?.[0] || "")).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="font-medium">{m.user.firstName} {m.user.lastName}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <Textarea
                                                value={comment}
                                                onChange={handleCommentChange}
                                                onKeyDown={(e) => {
                                                    if (showMentions) {
                                                        if (e.key === "ArrowDown") {
                                                            e.preventDefault();
                                                            setSelectedMentionIndex(prev => (prev + 1) % filteredMentions.length);
                                                        } else if (e.key === "ArrowUp") {
                                                            e.preventDefault();
                                                            setSelectedMentionIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length);
                                                        } else if (e.key === "Enter" || e.key === "Tab") {
                                                            e.preventDefault();
                                                            if (filteredMentions[selectedMentionIndex]) {
                                                                handleSelectMention(filteredMentions[selectedMentionIndex]);
                                                            }
                                                        } else if (e.key === "Escape") {
                                                            setShowMentions(false);
                                                        }
                                                    }
                                                }}
                                                placeholder="Write a comment..."
                                                className="min-h-[80px]"
                                            />
                                            <Button
                                                size="icon"
                                                className="h-[80px]"
                                                disabled={!comment.trim() || createCommentMutation.isPending}
                                                onClick={handleSendComment}
                                            >
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {/* Sidebar (Properties) */}
                <div className="w-80 border-l bg-muted/10 p-6 space-y-6 overflow-auto">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                        <Select
                            value={task?.status as any}
                            onValueChange={(val) => updateTaskMutation.mutate({ status: val as any })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TASK_STATUSES.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Priority</label>
                        <Select
                            value={task?.priority as any}
                            onValueChange={(val) => updateTaskMutation.mutate({ priority: val as any })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TASK_PRIORITIES.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Assignee</label>
                        <Select
                            value={task?.assigneeId || "unassigned"}
                            onValueChange={(val) => updateTaskMutation.mutate({ assigneeId: val === "unassigned" ? null : val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Assignee" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {members?.map(m => (
                                    <SelectItem key={m.user.id} value={m.user.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={m.user.profileImageUrl || undefined} />
                                                <AvatarFallback className="text-[10px]">
                                                    {((m.user.firstName?.[0] || "") + (m.user.lastName?.[0] || "")).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {m.user.firstName} {m.user.lastName}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Reviewer</label>
                        <Select
                            value={task?.reviewerId || "unassigned"}
                            onValueChange={(val) => updateTaskMutation.mutate({ reviewerId: val === "unassigned" ? null : val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Reviewer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {members?.map(m => (
                                    <SelectItem key={m.user.id} value={m.user.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={m.user.profileImageUrl || undefined} />
                                                <AvatarFallback className="text-[10px]">
                                                    {((m.user.firstName?.[0] || "") + (m.user.lastName?.[0] || "")).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {m.user.firstName} {m.user.lastName}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Tester</label>
                        <Select
                            value={task?.testerId || "unassigned"}
                            onValueChange={(val) => updateTaskMutation.mutate({ testerId: val === "unassigned" ? null : val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Tester" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {members?.map(m => (
                                    <SelectItem key={m.user.id} value={m.user.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={m.user.profileImageUrl || undefined} />
                                                <AvatarFallback className="text-[10px]">
                                                    {((m.user.firstName?.[0] || "") + (m.user.lastName?.[0] || "")).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {m.user.firstName} {m.user.lastName}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Start Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal h-10",
                                        !task.startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {task?.startDate ? format(new Date(task.startDate), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={task?.startDate ? new Date(task.startDate) : undefined}
                                    onSelect={(date) => updateTaskMutation.mutate({ startDate: (date ? date.toISOString() : null) as any })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Due Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !task?.dueDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {task?.dueDate ? format(new Date(task.dueDate), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={task?.dueDate ? new Date(task.dueDate) : undefined}
                                    onSelect={(date) => updateTaskMutation.mutate({ dueDate: (date ? date.toISOString() : null) as any })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Milestone</label>
                        <Select
                            value={task?.milestoneId || "no-milestone"}
                            onValueChange={(val) => updateTaskMutation.mutate({ milestoneId: val === "no-milestone" ? null : val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Milestone" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-milestone">No Milestone</SelectItem>
                                {milestones?.map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Delivery Role</label>
                        <Select
                            value={task?.deliveryRole || "none"}
                            onValueChange={(val) => updateTaskMutation.mutate({ deliveryRole: val === "none" ? null : val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Set role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Set role</SelectItem>
                                <SelectItem value="Frontend">Frontend</SelectItem>
                                <SelectItem value="Backend">Backend</SelectItem>
                                <SelectItem value="Full Stack">Full Stack</SelectItem>
                                <SelectItem value="Design">Design</SelectItem>
                                <SelectItem value="QA">QA</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div >

            <CreateTaskDialog
                open={showCreateSubtask}
                onClose={() => setShowCreateSubtask(false)}
                projectId={task.projectId}
                parentId={task.id}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/tasks/search", task.projectId, { parentId: task.id }] });
                    setShowCreateSubtask(false);
                }}
                projects={[project]}
                members={members?.map(m => m.user).filter(Boolean)}
            />
        </div >
    );
}

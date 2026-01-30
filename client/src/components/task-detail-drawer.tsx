import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MessageSquare, 
  User, 
  Trash2,
  X,
  Send,
  Play,
  Square
} from "lucide-react";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { format } from "date-fns";
import type { Task, Comment } from "@shared/schema";
import type { User as UserType } from "@shared/models/auth";

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  projectId: string;
  members: UserType[];
}

export function TaskDetailDrawer({ task, open, onClose, projectId, members }: TaskDetailDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ["/api/tasks", task?.id, "comments"],
    enabled: !!task?.id,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      return apiRequest("PATCH", `/api/tasks/${task?.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/recent"] });
      toast({ title: "Task updated" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/tasks/${task?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/recent"] });
      onClose();
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/tasks/${task?.id}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "comments"] });
      setNewComment("");
      toast({ title: "Comment added" });
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/timelogs/start", { taskId: task?.id });
    },
    onSuccess: () => {
      setIsTracking(true);
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      toast({ title: "Timer started" });
    },
    onError: () => {
      toast({ title: "Failed to start timer", variant: "destructive" });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/timelogs/stop", { taskId: task?.id });
    },
    onSuccess: () => {
      setIsTracking(false);
      queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
      toast({ title: "Timer stopped" });
    },
    onError: () => {
      toast({ title: "Failed to stop timer", variant: "destructive" });
    },
  });

  if (!task) return null;

  const getStatusClass = (status: string) => {
    return `status-${status.replace("_", "-")}`;
  };

  const getPriorityClass = (priority: string) => {
    return `priority-${priority}`;
  };

  const getInitials = (member: UserType) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
    }
    return member.email?.[0].toUpperCase() || "?";
  };

  const getMemberName = (member: UserType) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    return member.email || "Unknown";
  };

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <SheetTitle className="text-left pr-8">{task.title}</SheetTitle>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Select
                  value={task.status}
                  onValueChange={(value) => updateTaskMutation.mutate({ status: value as any })}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${status.color}`} />
                          {status.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <Select
                  value={task.priority}
                  onValueChange={(value) => updateTaskMutation.mutate({ priority: value as any })}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((priority) => (
                      <SelectItem key={priority.id} value={priority.id}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${priority.color}`} />
                          {priority.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <Textarea
                value={task.description || ""}
                onChange={(e) => updateTaskMutation.mutate({ description: e.target.value })}
                placeholder="Add a description..."
                className="min-h-[100px] resize-none"
                data-testid="input-description"
              />
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Assignee</label>
              <Select
                value={task.assigneeId || "unassigned"}
                onValueChange={(value) => updateTaskMutation.mutate({ assigneeId: value === "unassigned" ? null : value })}
              >
                <SelectTrigger data-testid="select-assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Unassigned
                    </div>
                  </SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.profileImageUrl || undefined} />
                          <AvatarFallback className="text-[10px]">{getInitials(member)}</AvatarFallback>
                        </Avatar>
                        {getMemberName(member)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-due-date">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {task.dueDate ? format(new Date(task.dueDate), "PPP") : "Set due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={task.dueDate ? new Date(task.dueDate) : undefined}
                    onSelect={(date) => updateTaskMutation.mutate({ dueDate: date?.toISOString() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Tracking */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Time Tracking</label>
              <div className="flex gap-2">
                {isTracking ? (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => stopTimerMutation.mutate()}
                    disabled={stopTimerMutation.isPending}
                    data-testid="button-stop-timer"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Timer
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => startTimerMutation.mutate()}
                    disabled={startTimerMutation.isPending}
                    data-testid="button-start-timer"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Timer
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">Comments</span>
                <Badge variant="secondary" className="text-xs">{comments?.length || 0}</Badge>
              </div>

              {/* Comment Input */}
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmitComment()}
                  data-testid="input-comment"
                />
                <Button
                  size="icon"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  data-testid="button-send-comment"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {commentsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading comments...</p>
                ) : comments && comments.length > 0 ? (
                  comments.map((comment) => {
                    const author = members.find((m) => m.id === comment.authorId);
                    return (
                      <div key={comment.id} className="flex gap-3 p-3 rounded-md bg-muted/30">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={author?.profileImageUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {author ? getInitials(author) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {author ? getMemberName(author) : "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.createdAt!), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{comment.content}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t shrink-0">
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("Are you sure you want to delete this task?")) {
                deleteTaskMutation.mutate();
              }
            }}
            disabled={deleteTaskMutation.isPending}
            data-testid="button-delete-task"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Task
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

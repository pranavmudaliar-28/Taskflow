import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MessageSquare, Play, Square } from "lucide-react";
import type { Task } from "@shared/schema";
import { TASK_PRIORITIES } from "@/lib/constants";
import { formatDurationShort } from "@/lib/utils"; // We might need to move this util or duplicate it

interface TaskCardProps {
  task: Task;
  assignee?: { id: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null; email?: string | null };
  onClick?: () => void;
  commentCount?: number;
  isTracking?: boolean;
  onToggleTimer?: (e: React.MouseEvent) => void;
  totalDuration?: number;
}

export function TaskCard({
  task,
  assignee,
  onClick,
  commentCount = 0,
  isTracking = false,
  onToggleTimer,
  totalDuration = 0
}: TaskCardProps) {
  const priority = TASK_PRIORITIES.find(p => p.id === task.priority);

  const getPriorityClass = () => {
    switch (task.priority) {
      case "urgent": return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400";
      case "high": return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400";
      case "medium": return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
      default: return "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400";
    }
  };

  const getInitials = () => {
    if (assignee?.firstName && assignee?.lastName) {
      return `${assignee.firstName[0]}${assignee.lastName[0]}`.toUpperCase();
    }
    if (assignee?.email) {
      return assignee.email[0].toUpperCase();
    }
    return "?";
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  // Helper for formatting duration (simple version if utils not available)
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-150 ${isTracking ? 'ring-2 ring-primary border-primary' : 'hover-elevate active-elevate-2'}`}
      onClick={onClick}
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="p-3 space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <div className="flex justify-between items-start gap-2">
            <p className="font-medium text-sm leading-snug line-clamp-2" data-testid={`task-title-${task.id}`}>
              {task.title}
            </p>
            {onToggleTimer && (
              <Button
                size="icon"
                variant={isTracking ? "destructive" : "ghost"}
                className={`h-6 w-6 shrink-0 ${isTracking ? '' : 'text-muted-foreground hover:text-primary'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTimer(e);
                }}
              >
                {isTracking ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Priority Badge & Time */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant="secondary" className={`text-xs ${getPriorityClass()}`}>
            {priority?.label || task.priority}
          </Badge>
          {(totalDuration > 0 || isTracking) && (
            <span className={`text-[10px] font-medium flex items-center gap-1 ${isTracking ? 'text-primary' : 'text-muted-foreground'}`}>
              <Clock className="h-3 w-3" />
              {formatTime(totalDuration)}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.dueDate && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                <Calendar className="h-3 w-3" />
                <span>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
            {commentCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{commentCount}</span>
              </div>
            )}
          </div>

          {assignee && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignee.profileImageUrl || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

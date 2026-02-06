import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./task-card";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import type { Task } from "@shared/schema";
import type { User } from "@shared/models/auth";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  users: Map<string, User>;
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
}

export function KanbanColumn({
  id,
  title,
  color,
  tasks,
  users,
  onTaskClick,
  onAddTask,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col bg-muted/30 rounded-lg min-w-[280px] max-w-[320px] h-full">
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${color}`} />
          <span className="font-medium text-sm">{title}</span>
          <Badge variant="secondary" className="text-xs ml-1">
            {tasks.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onAddTask}
          data-testid={`button-add-task-${id}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
          >
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={dragSnapshot.isDragging ? "opacity-90" : ""}
                    >
                      <TaskCard
                        task={task}
                        assignee={task.assigneeId ? users.get(task.assigneeId) || undefined : undefined}
                        onClick={() => onTaskClick(task)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {tasks.length === 0 && (
                <div className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">No tasks</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
}

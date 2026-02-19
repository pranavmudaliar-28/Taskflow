
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TaskCard } from "./task-card";
import { Droppable, Draggable, DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { Task, Milestone } from "@shared/schema";
import type { User } from "@shared/models/auth";

interface MilestoneColumnProps {
    id: string; // milestone id or "no-milestone"
    title: string;
    tasks: Task[];
    users: Map<string, User>;
    onTaskClick: (task: Task) => void;
    onAddTask: () => void;
    activeTaskId?: string | null;
    onToggleTimer?: (taskId: string) => void;
    taskDurations?: Record<string, number>;
}

function MilestoneColumn({
    id,
    title,
    tasks,
    users,
    onTaskClick,
    onAddTask,
    activeTaskId,
    onToggleTimer,
    taskDurations = {},
}: MilestoneColumnProps) {
    return (
        <div className="flex flex-col bg-muted/30 rounded-lg min-w-[320px] max-w-[360px] h-full shrink-0">
            <div className="flex items-center justify-between gap-2 p-3 border-b">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-semibold text-sm px-2 py-0.5 border-primary/20 bg-primary/5 text-primary">
                        {title}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {tasks.length}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onAddTask}
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
                        style={{ minHeight: "100px" }}
                    >
                        <div className="space-y-2">
                            {tasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(dragProvided, dragSnapshot) => (
                                        <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            {...dragProvided.dragHandleProps}
                                            className={dragSnapshot.isDragging ? "opacity-90 scale-[1.02] transform" : ""}
                                        >
                                            <TaskCard
                                                task={task}
                                                assignee={task.assigneeId ? users.get(task.assigneeId) || undefined : undefined}
                                                onClick={() => onTaskClick(task)}
                                                isTracking={activeTaskId === task.id}
                                                onToggleTimer={onToggleTimer ? () => onToggleTimer(task.id) : undefined}
                                                totalDuration={taskDurations[task.id] || 0}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            {tasks.length === 0 && (
                                <div className="p-4 text-center border-2 border-dashed border-muted-foreground/10 rounded-md">
                                    <p className="text-xs text-muted-foreground">Drop tasks here</p>
                                    <Button variant="ghost" size="sm" className="h-auto p-0 text-[10px]" onClick={onAddTask}>
                                        + Add Task
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Droppable>
        </div>
    );
}

interface MilestoneBoardProps {
    tasks: Task[];
    milestones: Milestone[];
    users: Map<string, User>;
    onTaskClick: (task: Task) => void;
    onAddTask: (milestoneId: string | undefined) => void;
    activeTaskId?: string | null;
    onToggleTimer: (taskId: string) => void;
    taskDurations: Record<string, number>;
    onDragEnd: (result: DropResult) => void;
}

export function MilestoneBoard({
    tasks,
    milestones,
    users,
    onTaskClick,
    onAddTask,
    activeTaskId,
    onToggleTimer,
    taskDurations,
    onDragEnd
}: MilestoneBoardProps) {
    // Group tasks by milestone
    const columns = useMemo(() => {
        const grouped: Record<string, Task[]> = {};

        // Initialize groups for existing milestones
        milestones.forEach(m => {
            grouped[m.id] = [];
        });
        // Initialize "No Milestone" group
        grouped["no-milestone"] = [];

        tasks.forEach(task => {
            if (task.milestoneId && grouped[task.milestoneId]) {
                grouped[task.milestoneId].push(task);
            } else if (task.milestoneId) {
                // If milestoneId exists but not in list (shouldn't happen often if synced), dump to no-milestone or maybe create a temporary group?
                // For now, put in no-milestone to be safe or maybe we missed fetching it.
                // Actually, let's fallback to checking legacy string if id match fails?
                // Or better, just put in no-milestone for now.
                grouped["no-milestone"].push(task);
            } else {
                grouped["no-milestone"].push(task);
            }
        });

        return grouped;
    }, [tasks, milestones]);

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="h-full p-4 overflow-x-auto">
                <div className="flex gap-4 h-full">
                    {milestones.map((milestone) => (
                        <MilestoneColumn
                            key={milestone.id}
                            id={milestone.id}
                            title={milestone.title}
                            tasks={columns[milestone.id] || []}
                            users={users}
                            onTaskClick={onTaskClick}
                            onAddTask={() => onAddTask(milestone.id)}
                            activeTaskId={activeTaskId}
                            onToggleTimer={onToggleTimer}
                            taskDurations={taskDurations}
                        />
                    ))}

                    {/* Always show No Milestone column at the end */}
                    <MilestoneColumn
                        id="no-milestone"
                        title="No Milestone"
                        tasks={columns["no-milestone"] || []}
                        users={users}
                        onTaskClick={onTaskClick}
                        onAddTask={() => onAddTask(undefined)}
                        activeTaskId={activeTaskId}
                        onToggleTimer={onToggleTimer}
                        taskDurations={taskDurations}
                    />

                    {/* Empty State / Add Milestone Helper */}
                    {milestones.length === 0 && columns["no-milestone"].length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg h-[200px] w-[300px]">
                            <p className="text-sm text-muted-foreground text-center mb-2">No milestones found</p>
                            <p className="text-xs text-muted-foreground/70 text-center">Create a milestone in settings or add tasks</p>
                        </div>
                    )}
                </div>
            </div>
        </DragDropContext>
    );
}

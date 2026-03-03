import React, { useState, useMemo, useEffect } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    type ColumnDef,
    getSortedRowModel,
    type SortingState,
    type RowSelectionState,
    getExpandedRowModel,
    type ExpandedState,
} from "@tanstack/react-table";
import type { Task, Milestone } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowUpDown, Calendar as CalendarIcon, User as UserIcon, Check, MoreHorizontal, GripVertical, ChevronDown, ChevronRight, Share2, Play, Square, Clock, Plus } from "lucide-react";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TaskWithChildren extends Task {
    subRows?: TaskWithChildren[];
}

interface TaskTableProps {
    tasks: TaskWithChildren[];
    users: Map<string, User>;
    milestones: Milestone[];
    onTaskClick: (task: Task) => void;
    getTaskUrl?: (task: Task) => string;
    onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
    onReorder?: (items: { id: string; order: number }[]) => void;
    onCreateSubtask?: (parentId: string) => void;
    // Expansion props (optional, controlled)
    expanded?: ExpandedState;
    onExpandedChange?: (expanded: ExpandedState) => void;
    // Selection props (optional)
    rowSelection?: RowSelectionState;
    setRowSelection?: (selection: RowSelectionState) => void;
}

interface SortableRowProps {
    row: any;
    onTaskClick: (task: Task) => void;
}

function SortableRow({ row, onTaskClick, enabled }: SortableRowProps & { enabled: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: row.original.id,
        disabled: !enabled
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        position: isDragging ? 'relative' as const : undefined,
    };

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            data-state={row.getIsSelected() && "selected"}
            onClick={() => onTaskClick(row.original)}
            className={cn(
                // Base: tall enough to tap comfortably on mobile (≥48px recommended by Material/HIG)
                "cursor-pointer border-b border-border/50 hover:bg-muted/50 transition-colors duration-200",
                "min-h-[52px] touch-manipulation",   // 52px min-height + no touch delay
                isDragging && "bg-accent opacity-50",
                !enabled && "cursor-default"
            )}
        >
            {row.getVisibleCells().map((cell: any) => {
                if (cell.column.id === "drag") {
                    return (
                        <TableCell key={cell.id} className="w-[30px] sm:w-[40px] p-0 pl-1 sm:pl-2">
                            <div
                                {...(enabled ? attributes : {})}
                                {...(enabled ? listeners : {})}
                                className={cn(
                                    "transition-colors p-1",
                                    enabled ? "cursor-grab hover:text-primary text-muted-foreground/70" : "cursor-not-allowed text-muted-foreground/30"
                                )}
                                title={enabled ? "Drag to reorder" : "Reordering is disabled when sorting is active"}
                            >
                                <GripVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </div>
                        </TableCell>
                    )
                }
                return (
                    <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        // More vertical padding on mobile for easier finger tapping
                        className="py-3 px-2 sm:p-3"
                    >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                )
            })}
        </TableRow>
    );
}

const columnHelper = createColumnHelper<TaskWithChildren>();

export function TaskTable({ tasks, users, milestones, onTaskClick, getTaskUrl, onTaskUpdate, onReorder, onCreateSubtask, rowSelection, setRowSelection, expanded: controlledExpanded, onExpandedChange }: TaskTableProps) {
    const isMobile = useIsMobile();
    const [isLargeScreen, setIsLargeScreen] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);

    useEffect(() => {
        const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [tempTitle, setTempTitle] = useState("");

    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch active logs
    const { data: activeLogs } = useQuery<any[]>({
        queryKey: ["/api/timelogs/active"],
        refetchInterval: 5000,
    });

    const startTimerMutation = useMutation({
        mutationFn: async (taskId: string) => {
            const res = await apiRequest("POST", "/api/timelogs/start", { taskId });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/timelogs/active"] });
            toast({ title: "Timer started" });
        },
    });

    const stopTimerMutation = useMutation({
        mutationFn: async (taskId: string) => {
            const res = await apiRequest("POST", "/api/timelogs/stop", { taskId });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/timelogs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/timelogs/active"] });
            toast({ title: "Timer stopped" });
        },
    });

    // Use controlled state if provided, otherwise internal
    const expanded = controlledExpanded ?? internalExpanded;
    const setExpanded = onExpandedChange ?? setInternalExpanded;

    const milestonesMap = new Map(milestones.map(m => [m.id, m]));

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id && onReorder) {
            const oldIndex = tasks.findIndex((t) => t.id === active.id);
            const newIndex = tasks.findIndex((t) => t.id === over?.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(tasks, oldIndex, newIndex).map((t, index) => ({
                    id: t.id,
                    order: index // This order is relative to current view, might need adjustment if paginated/filtered
                    // But requirement says "reorder ... across refresh and filters".
                    // If filtered, we are reordering subset? That's dangerous.
                    // Ideally we only allow reorder when NO filters are active.
                }));
                onReorder(newOrder);
            }
        }
    };

    // Only allow drag if onReorder is provided
    const enableDnd = !!onReorder;

    const columns: ColumnDef<TaskWithChildren, any>[] = useMemo(() => [
        // Drag Handle Column
        {
            id: "drag",
            header: () => null,
            cell: () => null, // Rendered by SortableRow
            size: 40,
            enableResizing: false,
        },
        // Selection Column
        ...(setRowSelection ? [{
            id: "select",
            header: ({ table }: any) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }: any) => (
                <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
            size: 40,
        }] : []),
        columnHelper.accessor("title", {
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="pl-0 hover:bg-transparent -ml-3 h-8 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        Name
                        <ArrowUpDown className="ml-1.5 h-3 w-3" />
                    </Button>
                );
            },
            cell: ({ row, getValue }) => (
                <div style={{ paddingLeft: `${row.depth * (isLargeScreen ? 20 : 12)}px` }} className="flex items-center gap-1 sm:gap-2 group/title w-full">
                    {row.getCanExpand() ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                row.getToggleExpandedHandler()();
                            }}
                            className="cursor-pointer"
                        >
                            {row.getIsExpanded() ? (
                                <span className="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                                    <ChevronDown className="h-3 w-3" />
                                </span>
                            ) : (
                                <span className="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                                    <ChevronRight className="h-3 w-3" />
                                </span>
                            )}
                        </button>
                    ) : (
                        <span className="w-4" />
                    )}

                    {editingTitleId === row.original.id ? (
                        <Input
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={() => {
                                if (tempTitle && tempTitle !== row.original.title) {
                                    onTaskUpdate?.(row.original.id, { title: tempTitle });
                                }
                                setEditingTitleId(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    if (tempTitle && tempTitle !== row.original.title) {
                                        onTaskUpdate?.(row.original.id, { title: tempTitle });
                                    }
                                    setEditingTitleId(null);
                                }
                                if (e.key === "Escape") {
                                    setEditingTitleId(null);
                                }
                            }}
                            className="h-7 py-0 px-1 text-sm font-medium"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span
                                className={cn(
                                    "font-medium text-sm truncate rounded px-1 transition-colors duration-150",
                                    "hover:text-primary hover:underline underline-offset-2 decoration-primary/40"
                                )}
                                // Clicking the name opens the detail
                                onClick={() => onTaskClick(row.original)}
                                style={{ cursor: "pointer" }}
                            >
                                {getValue()}
                            </span>

                            {/* ClickUp-style Action Buttons appearing on hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover/title:opacity-100 transition-opacity duration-150">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTaskClick(row.original);
                                    }}
                                    className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                    title="Open Detail"
                                >
                                    <Share2 className="h-3 w-3" />
                                </button>
                                {onCreateSubtask && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCreateSubtask(row.original.id);
                                        }}
                                        className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                        title="Add Subtask"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTitleId(row.original.id);
                                        setTempTitle(row.original.title);
                                    }}
                                    className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                    title="Rename"
                                >
                                    <MoreHorizontal className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    )}

                    {row.original.subRows && row.original.subRows.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1 text-muted-foreground shrink-0">
                            {row.original.subRows.length}
                        </Badge>
                    )}
                    {row.original.parentId && <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground opacity-70 shrink-0">Sub</Badge>}
                </div>
            ),
            size: 300,
            enableResizing: true,
        }),
        columnHelper.accessor("status", {
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="pl-0 hover:bg-transparent -ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    Status
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: (info) => {
                const statusId = info.getValue();
                const status = TASK_STATUSES.find(s => s.id === statusId);
                const task = info.row.original;

                return (
                    <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="w-full h-full flex items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 p-0 px-2 -ml-2 hover:bg-muted/50 w-full justify-start font-normal"
                                >
                                    <Badge variant="outline" className={cn("capitalize font-bold text-[10px] h-5 px-2 py-0 border-border/50 transition-all", status?.color.replace("bg-", "text-"), "bg-muted/30 hover:bg-muted")}>
                                        <div className={cn("w-1 h-1 rounded-full mr-1.5", status?.color)} />
                                        {status?.label || statusId}
                                    </Badge>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {TASK_STATUSES.map((s) => (
                                    <DropdownMenuItem
                                        key={s.id}
                                        onClick={() => onTaskUpdate?.(task.id, { status: s.id })}
                                    >
                                        <div className={`w-2 h-2 rounded-full mr-2 ${s.color.replace("text-", "bg-")}`} />
                                        {s.label}
                                        {s.id === statusId && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
            size: 140,
            enableResizing: true,
        }),
        columnHelper.accessor("assigneeId", {
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="pl-0 hover:bg-transparent -ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    Assignee
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: (info) => {
                const userId = info.getValue();
                const user = userId ? users.get(userId) : null;
                const task = info.row.original;
                const usersList = Array.from(users.values());

                return (
                    <div onClick={(e) => e.stopPropagation()} className="w-full h-full flex items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 p-0 px-2 -ml-2 hover:bg-muted/50 flex items-center gap-2 w-full justify-start font-normal"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {user ? (
                                        <>
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={user.profileImageUrl || undefined} />
                                                <AvatarFallback className="text-[10px]">
                                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm truncate max-w-[100px]">{user.firstName} {user.lastName}</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-6 w-6 rounded-full border border-dashed flex items-center justify-center bg-background">
                                                <UserIcon className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                            <span className="text-muted-foreground text-xs">Assign</span>
                                        </>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search user..." />
                                    <CommandList>
                                        <CommandEmpty>No user found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="unassigned"
                                                onSelect={() => onTaskUpdate?.(task.id, { assigneeId: null })}
                                            >
                                                <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                                                    {!userId ? <Check className="h-4 w-4" /> : null}
                                                </div>
                                                <span>Unassigned</span>
                                            </CommandItem>
                                            {usersList.map((u) => (
                                                <CommandItem
                                                    key={u.id}
                                                    value={`${u.firstName} ${u.lastName}`}
                                                    onSelect={() => onTaskUpdate?.(task.id, { assigneeId: u.id })}
                                                >
                                                    <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                                                        {userId === u.id ? <Check className="h-4 w-4" /> : null}
                                                    </div>
                                                    <Avatar className="h-6 w-6 mr-2">
                                                        <AvatarImage src={u.profileImageUrl || undefined} />
                                                        <AvatarFallback className="text-[10px]">
                                                            {u.firstName?.[0]}{u.lastName?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span>{u.firstName} {u.lastName}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                );
            },
            size: 180,
            enableResizing: true,
        }),
        columnHelper.accessor("priority", {
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="pl-0 hover:bg-transparent -ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    Priority
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: (info) => {
                const priorityId = info.getValue();
                const priority = TASK_PRIORITIES.find(p => p.id === priorityId);
                const task = info.row.original;

                return (
                    <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="w-full h-full flex items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 p-0 px-2 -ml-2 hover:bg-muted/50 w-full justify-start font-normal"
                                >
                                    <Badge variant="secondary" className="capitalize text-[10px] font-bold h-5 px-2 bg-muted/50 text-muted-foreground border border-border group-hover:bg-muted group-hover:text-foreground transition-all">
                                        {priority?.label || priorityId}
                                    </Badge>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {TASK_PRIORITIES.map((p) => (
                                    <DropdownMenuItem
                                        key={p.id}
                                        onClick={() => onTaskUpdate?.(task.id, { priority: p.id })}
                                    >
                                        <div className={`w-2 h-2 rounded-full mr-2 ${p.id === 'urgent' ? 'bg-red-500' :
                                            p.id === 'high' ? 'bg-orange-500' :
                                                p.id === 'medium' ? 'bg-yellow-500' :
                                                    'bg-blue-500'
                                            }`} />
                                        {p.label}
                                        {p.id === priorityId && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
            size: 100,
            enableResizing: true,
        }),
        columnHelper.accessor("startDate", {
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="pl-0 hover:bg-transparent -ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    Start Date
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: (info) => {
                const date = info.getValue();
                const task = info.row.original;

                return (
                    <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="w-full h-full flex items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"ghost"}
                                    className={cn(
                                        "h-8 p-0 px-2 -ml-2 hover:bg-muted/50 w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3 w-3 opacity-70" />
                                    {date ? format(new Date(date), "MMM d") : <span className="text-xs">Pick date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                                <Calendar
                                    mode="single"
                                    selected={date ? new Date(date) : undefined}
                                    onSelect={(newDate) => onTaskUpdate?.(task.id, { startDate: newDate })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                );
            },
            size: 120,
            enableResizing: true,
        }),
        columnHelper.accessor("dueDate", {
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="pl-0 hover:bg-transparent -ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    Due Date
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: (info) => {
                const date = info.getValue();
                const task = info.row.original;

                return (
                    <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="w-full h-full flex items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"ghost"}
                                    className={cn(
                                        "h-8 p-0 px-2 -ml-2 hover:bg-muted/50 w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3 w-3 opacity-70" />
                                    {date ? format(new Date(date), "MMM d") : <span className="text-xs">Pick date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                                <Calendar
                                    mode="single"
                                    selected={date ? new Date(date) : undefined}
                                    onSelect={(newDate) => onTaskUpdate?.(task.id, { dueDate: newDate })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                );
            },
            size: 120,
            enableResizing: true,
        }),
        columnHelper.accessor("deliveryRole", {
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="pl-0 hover:bg-transparent -ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    Role
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: (info) => {
                const role = info.getValue();
                const task = info.row.original;
                const ROLES = ["Frontend", "Backend", "Fullstack", "Design", "QA", "Product", "DevOps"];

                return (
                    <div onClick={(e) => e.stopPropagation()} className="w-full h-full flex items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 p-0 px-2 -ml-2 hover:bg-muted/50 w-full justify-start font-normal"
                                >
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] h-5 font-bold border-border py-0 px-2 transition-all",
                                            role ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" : "text-muted-foreground border-dashed bg-transparent"
                                        )}
                                    >
                                        {role || "+ Role"}
                                    </Badge>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {ROLES.map((r) => (
                                    <DropdownMenuItem
                                        key={r}
                                        onClick={() => onTaskUpdate?.(task.id, { deliveryRole: r })}
                                    >
                                        {r}
                                        {r === role && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
            size: 120,
            enableResizing: true,
        }),
        columnHelper.accessor("milestoneId", {
            id: "milestone",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="pl-0 hover:bg-transparent -ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    Milestone
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: (info) => {
                const milestoneId = info.getValue();
                const task = info.row.original;
                const milestoneName = milestoneId
                    ? milestonesMap.get(milestoneId)?.title
                    : task.milestone; // Fallback to legacy field

                return (
                    <div onClick={(e) => e.stopPropagation()} className="w-full h-full flex items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 p-0 px-2 -ml-2 hover:bg-muted/50 w-full justify-start font-normal"
                                >
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] h-5 font-bold py-0 px-2 transition-all",
                                            milestoneName
                                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                : "text-muted-foreground border-dashed border-border bg-transparent"
                                        )}
                                    >
                                        {milestoneName || "+ Milestone"}
                                    </Badge>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                    onClick={() => onTaskUpdate?.(task.id, { milestoneId: null, milestone: null })}
                                >
                                    <span className="text-muted-foreground">No Milestone</span>
                                    {!milestoneId && !task.milestone && <Check className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {milestones.map((m) => (
                                    <DropdownMenuItem
                                        key={m.id}
                                        onClick={() => onTaskUpdate?.(task.id, { milestoneId: m.id })}
                                    >
                                        {m.title}
                                        {m.id === milestoneId && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
            size: 140,
            enableResizing: true,
        }),
        columnHelper.display({
            id: "actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(row.original.id);
                        }}>
                            Copy Task ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onCreateSubtask?.(row.original.id);
                        }}>
                            Create Subtask
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick(row.original);
                        }}>
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            const taskUrl = getTaskUrl ? getTaskUrl(row.original) : `/tasks/${row.original.slug || row.original.id}`;
                            const url = `${window.location.origin}${taskUrl}`;
                            navigator.clipboard.writeText(url);
                        }}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Copy Task Link
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            size: 40,
        }),
        columnHelper.display({
            id: "timer",
            header: () => (
                <div className="w-full h-8 flex items-center justify-center text-muted-foreground">
                    <Clock className="h-4 w-4" />
                </div>
            ),
            cell: ({ row }) => {
                const taskId = row.original.id;
                const isTracking = activeLogs?.some(log => log.taskId === taskId);

                const handleToggleTimer = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (isTracking) {
                        stopTimerMutation.mutate(taskId);
                    } else {
                        startTimerMutation.mutate(taskId);
                    }
                };

                return (
                    <div className="w-full flex items-center justify-center pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant={isTracking ? "destructive" : "ghost"}
                            size="icon"
                            className={cn(
                                "h-7 w-7 sm:h-8 sm:w-8 rounded-lg transition-all",
                                isTracking
                                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                            )}
                            onClick={handleToggleTimer}
                            disabled={startTimerMutation.isPending || stopTimerMutation.isPending}
                        >
                            {isTracking ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                );
            },
            size: 60,
        }),
    ], [users, milestones, onTaskUpdate, onTaskClick, getTaskUrl, onCreateSubtask, isLargeScreen, setRowSelection, activeLogs]);

    const table = useReactTable({
        data: tasks,
        columns,
        getRowId: (row) => row.id,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getSubRows: (row) => row.subRows,
        onSortingChange: setSorting,
        onExpandedChange: (updater) => {
            if (typeof updater === 'function') {
                setExpanded(updater(expanded));
            } else {
                setExpanded(updater);
            }
        },
        columnResizeMode: "onChange",
        state: {
            sorting,
            expanded,
            rowSelection: rowSelection || {},
        },
        enableRowSelection: !!setRowSelection,
        onRowSelectionChange: setRowSelection ? (updater) => {
            // We need to handle functional updates correctly if react-table passes a function
            if (typeof updater === 'function') {
                setRowSelection(updater(rowSelection || {}));
            } else {
                setRowSelection(updater);
            }
        } : undefined,
    });

    const sortableRowIds = useMemo(() => tasks.map(t => t.id), [tasks]);

    return (
        <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <Table style={{ width: table.getTotalSize() }}>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead
                                                key={header.id}
                                                style={{ width: header.getSize() }}
                                                className="relative group p-0 px-4 h-11"
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                {header.column.getCanResize() && (
                                                    <div
                                                        onMouseDown={header.getResizeHandler()}
                                                        onTouchStart={header.getResizeHandler()}
                                                        className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-primary/50 group-hover:bg-border ${header.column.getIsResizing() ? "bg-primary w-1" : "bg-transparent"
                                                            }`}
                                                    />
                                                )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            <SortableContext
                                items={sortableRowIds}
                                strategy={verticalListSortingStrategy}
                                disabled={!enableDnd}
                            >
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <SortableRow
                                            key={row.id}
                                            row={row}
                                            onTaskClick={onTaskClick}
                                            enabled={enableDnd}
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            No tasks found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </SortableContext>
                        </TableBody>
                    </Table>
                </DndContext>
            </div>
        </div>
    );
}

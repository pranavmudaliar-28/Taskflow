import { useState, useEffect } from "react";
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
import { ArrowUpDown, Calendar as CalendarIcon, User as UserIcon, Check, MoreHorizontal, GripVertical, ChevronDown, ChevronRight, Share2 } from "lucide-react";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

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

function SortableRow({ row, onTaskClick }: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: row.original.id });

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
            className={cn("cursor-pointer border-b border-slate-50/50 hover:bg-slate-50 transition-colors duration-200", isDragging && "bg-slate-50 opacity-50")}
        >
            {row.getVisibleCells().map((cell: any) => {
                if (cell.column.id === "drag") {
                    return (
                        <TableCell key={cell.id} className="w-[40px] p-0 pl-2">
                            <div
                                {...attributes}
                                {...listeners}
                                className="cursor-grab hover:text-primary text-muted-foreground/70 transition-colors p-1"
                                title="Drag to reorder"
                            >
                                <GripVertical className="h-4 w-4" />
                            </div>
                        </TableCell>
                    )
                }
                return (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className="p-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                )
            })}
        </TableRow>
    );
}

const columnHelper = createColumnHelper<TaskWithChildren>();

export function TaskTable({ tasks, users, milestones, onTaskClick, getTaskUrl, onTaskUpdate, onReorder, onCreateSubtask, rowSelection, setRowSelection, expanded: controlledExpanded, onExpandedChange }: TaskTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [tempTitle, setTempTitle] = useState("");

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

    // Only allow drag if not sorting and onReorder is provided
    const enableDnd = !!onReorder && sorting.length === 0;

    const columns: ColumnDef<TaskWithChildren, any>[] = [
        // Drag Handle Column
        ...(enableDnd ? [{
            id: "drag",
            header: () => null,
            cell: () => null, // Rendered by SortableRow
            size: 40,
            enableResizing: false,
        }] : []),
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
                        className="pl-0 hover:bg-transparent -ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        Name
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                );
            },
            cell: ({ row, getValue }) => (
                <div style={{ paddingLeft: `${row.depth * 20}px` }} className="flex items-center gap-2 group/title w-full">
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
                        <span
                            className="font-medium text-sm truncate cursor-text hover:bg-muted/30 px-1 rounded flex-1"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingTitleId(row.original.id);
                                setTempTitle(row.original.title);
                            }}
                        >
                            {getValue()}
                        </span>
                    )}

                    {row.original.subRows && row.original.subRows.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1 text-muted-foreground">
                            {row.original.subRows.length}
                        </Badge>
                    )}
                    {row.original.parentId && <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground opacity-70">Sub</Badge>}
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
                                    <Badge variant="outline" className={cn("capitalize font-bold text-[10px] h-5 px-2 py-0 border-slate-200 transition-all", status?.color.replace("bg-", "text-"), "bg-slate-50/30 hover:bg-slate-50")}>
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
                                    <Badge variant="secondary" className="capitalize text-[10px] font-bold h-5 px-2 bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-slate-100 group-hover:text-slate-600 transition-all">
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
                                            "text-[10px] h-5 font-bold border-slate-200 py-0 px-2 transition-all",
                                            role ? "bg-violet-50 text-violet-600 border-violet-100" : "text-slate-400 border-dashed bg-transparent"
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
                                                ? "bg-blue-50 text-blue-600 border-blue-100"
                                                : "text-slate-400 border-dashed border-slate-200 bg-transparent"
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
    ];

    const table = useReactTable({
        data: tasks,
        columns,
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
                                items={tasks.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                                disabled={!enableDnd}
                            >
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        enableDnd ? (
                                            <SortableRow
                                                key={row.id}
                                                row={row}
                                                onTaskClick={onTaskClick}
                                            />
                                        ) : (
                                            <TableRow
                                                key={row.id}
                                                data-state={row.getIsSelected() && "selected"}
                                                onClick={() => onTaskClick(row.original)}
                                                className="cursor-pointer hover:bg-muted/50"
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className="p-3">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        )
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

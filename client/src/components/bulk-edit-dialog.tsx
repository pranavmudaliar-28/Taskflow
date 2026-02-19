import { useState } from "react";
import { type Task } from "@shared/schema";
import { type User } from "@shared/models/auth";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, User as UserIcon } from "lucide-react";

interface BulkEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    users: Map<string, User>;
    onConfirm: (updates: Partial<Task>) => void;
    isSubmitting: boolean;
}

export function BulkEditDialog({
    open,
    onOpenChange,
    selectedCount,
    users,
    onConfirm,
    isSubmitting,
}: BulkEditDialogProps) {
    const [status, setStatus] = useState<string | "none">("none");
    const [priority, setPriority] = useState<string | "none">("none");
    const [assigneeId, setAssigneeId] = useState<string | "none">("none");

    const usersList = Array.from(users.values());

    const handleConfirm = () => {
        const updates: Partial<Task> = {};
        if (status !== "none") updates.status = status as any;
        if (priority !== "none") updates.priority = priority as any;
        if (assigneeId !== "none") updates.assigneeId = assigneeId === "unassigned" ? null : assigneeId;

        onConfirm(updates);
    };

    const hasChanges = status !== "none" || priority !== "none" || assigneeId !== "none";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Bulk Edit {selectedCount} Tasks</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="No change" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No change</SelectItem>
                                {TASK_STATUSES.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        <div className="flex items-center">
                                            <div className={`w-2 h-2 rounded-full mr-2 ${s.color.replace("text-", "bg-")}`} />
                                            {s.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger id="priority">
                                <SelectValue placeholder="No change" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No change</SelectItem>
                                {TASK_PRIORITIES.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        <div className="flex items-center">
                                            <div className={`w-2 h-2 rounded-full mr-2 ${p.id === 'urgent' ? 'bg-red-500' :
                                                p.id === 'high' ? 'bg-orange-500' :
                                                    p.id === 'medium' ? 'bg-yellow-500' :
                                                        'bg-blue-500'
                                                }`} />
                                            {p.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="assignee">Assignee</Label>
                        <Select value={assigneeId} onValueChange={setAssigneeId}>
                            <SelectTrigger id="assignee">
                                <SelectValue placeholder="No change" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No change</SelectItem>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {usersList.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={u.profileImageUrl || undefined} />
                                                <AvatarFallback className="text-[8px]">
                                                    {u.firstName?.[0]}{u.lastName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">{u.firstName} {u.lastName}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!hasChanges || isSubmitting}
                    >
                        {isSubmitting ? "Updating..." : `Update ${selectedCount} Tasks`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

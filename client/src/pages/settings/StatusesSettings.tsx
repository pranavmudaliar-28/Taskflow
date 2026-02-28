import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, GripVertical, X, Check, CheckCircle2 } from "lucide-react";
import { type WorkspaceSettings } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

const COLOR_PALETTE = [
    "#6366F1", "#EC4899", "#8B5CF6", "#F59E0B", "#10B981", "#3B82F6", "#6B7280"
];

export default function StatusesSettings() {
    const { user } = useAuth();
    const { toast } = useToast();

    const { data: settings, isLoading } = useQuery<WorkspaceSettings>({
        queryKey: ["/api/workspace/settings"],
    });

    const [newStatus, setNewStatus] = useState("");
    const currentStatuses = settings?.defaultTaskStatuses as string[] || ["todo", "in_progress", "done"];

    const updateSettings = useMutation({
        mutationFn: async (statuses: string[]) => {
            const res = await apiRequest("PATCH", "/api/workspace/settings", { defaultTaskStatuses: statuses });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/workspace/settings"] });
            toast({ title: "Statuses updated" });
        },
        onError: (e: any) => toast({ title: "Failed to update", description: e?.message, variant: "destructive" }),
    });

    const handleAddStatus = () => {
        if (!newStatus.trim()) return;
        if (currentStatuses.includes(newStatus.trim().toLowerCase())) {
            toast({ title: "Duplicate status", description: "This status already exists.", variant: "destructive" });
            return;
        }
        const updated = [...currentStatuses, newStatus.trim().toLowerCase()];
        updateSettings.mutate(updated);
        setNewStatus("");
    };

    const handleRemoveStatus = (status: string) => {
        if (status === "todo" || status === "done") {
            toast({ title: "Protected status", description: "You cannot remove the core 'To Do' or 'Done' statuses.", variant: "destructive" });
            return;
        }
        const updated = currentStatuses.filter(s => s !== status);
        updateSettings.mutate(updated);
    };

    const isAdmin = (user as any)?.role === "admin" || (user as any)?.role === "owner";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Task Statuses</h2>
                <p className="text-muted-foreground mt-1">Define the workflow stages for your tasks across the workspace.</p>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-violet-600" />
                        Current Workflow
                    </h3>

                    <div className="space-y-2">
                        {isLoading ? (
                            <div className="h-40 flex items-center justify-center">
                                <div className="h-6 w-6 border-2 border-violet-600/20 border-t-violet-600 rounded-full animate-spin" />
                            </div>
                        ) : (
                            currentStatuses.map((status, index) => (
                                <div
                                    key={status}
                                    className="flex items-center gap-3 p-3 bg-accent/10 hover:bg-accent/20 rounded-xl border border-border group transition-all"
                                >
                                    <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing" />
                                    <div
                                        className="h-3 w-3 rounded-full shrink-0"
                                        style={{ backgroundColor: COLOR_PALETTE[index % COLOR_PALETTE.length] }}
                                    />
                                    <span className="flex-1 font-semibold text-sm capitalize">{status.replace("_", " ")}</span>

                                    {index === 0 && <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-600 border-blue-500/20">START</Badge>}
                                    {index === currentStatuses.length - 1 && <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-600 border-emerald-500/20">END</Badge>}

                                    {status !== "todo" && status !== "done" && isAdmin && (
                                        <button
                                            onClick={() => handleRemoveStatus(status)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 rounded-md transition-all text-muted-foreground"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <div className="pt-4 flex gap-2">
                        <Input
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            placeholder="Add a new status (e.g. In Review)"
                            className="max-w-xs bg-background border-border"
                            onKeyDown={(e) => e.key === "Enter" && handleAddStatus()}
                        />
                        <Button
                            onClick={handleAddStatus}
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                            disabled={updateSettings.isPending || !newStatus}
                        >
                            <Plus className="h-4 w-4 mr-2" /> Add Status
                        </Button>
                    </div>
                )}
            </div>

            <div className="rounded-2xl border-2 border-violet-600/20 bg-violet-600/5 p-6 space-y-4">
                <h4 className="font-bold text-violet-900 dark:text-violet-100 flex items-center gap-2">
                    <Check className="h-5 w-5" /> Status Logic
                </h4>
                <p className="text-sm text-violet-800/80 dark:text-violet-200/80 leading-relaxed">
                    By default, your first status is treated as 'To Do' and your last status is treated as 'Done'.
                    Tasks in the 'Done' status will be excluded from active task counts and will be marked as completed in reports.
                </p>
            </div>
        </div>
    );
}

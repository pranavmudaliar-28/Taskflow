import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
    Zap,
    Clock,
    Tags,
    Layers,
    BarChart,
    MessageSquare,
    Link as LinkIcon,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { type FeatureFlags } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface ClickAppCardProps {
    id: keyof FeatureFlags;
    title: string;
    description: string;
    icon: React.ElementType;
    enabled: boolean;
    onToggle: (id: keyof FeatureFlags, enabled: boolean) => void;
    isLoading: boolean;
    isAdmin: boolean;
    category?: "productivity" | "collaboration" | "advanced";
}

function ClickAppCard({
    id, title, description, icon: Icon, enabled, onToggle, isLoading, isAdmin, category
}: ClickAppCardProps) {
    return (
        <div className="flex flex-col p-5 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-violet-600/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5 text-violet-600" />
                </div>
                <Switch
                    checked={enabled}
                    onCheckedChange={(v) => onToggle(id, v)}
                    disabled={!isAdmin || isLoading}
                    className="data-[state=checked]:bg-violet-600"
                />
            </div>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-foreground">{title}</h4>
                    {category === "advanced" && (
                        <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-amber-500/5 text-amber-600 border-amber-500/20">
                            PRO
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

export default function ClickAppsSettings() {
    const { user } = useAuth();
    const { toast } = useToast();

    const { data: flags, isLoading } = useQuery<FeatureFlags>({
        queryKey: ["/api/workspace/feature-flags"],
    });

    const updateFlag = useMutation({
        mutationFn: async ({ id, enabled }: { id: keyof FeatureFlags; enabled: boolean }) => {
            const res = await apiRequest("PATCH", "/api/workspace/feature-flags", { [id]: enabled });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/workspace/feature-flags"] });
            toast({ title: "Feature flag updated", variant: "success" });
        },
        onError: (e: any) => toast({ title: "Failed to update", description: e?.message, variant: "destructive" }),
    });

    const handleToggle = (id: keyof FeatureFlags, enabled: boolean) => {
        updateFlag.mutate({ id, enabled });
    };

    const isAdmin = (user as any).role === "admin" || (user as any).role === "owner";

    const featureList = [
        {
            id: "timeTracking" as const,
            title: "Time Tracking",
            description: "Track time spent on tasks and generate detailed time reports for your team.",
            icon: Clock,
            category: "productivity" as const,
        },
        {
            id: "automations" as const,
            title: "Automations",
            description: "Automate repetitive tasks with custom triggers and actions to save time.",
            icon: Zap,
            category: "advanced" as const,
        },
        {
            id: "taskPriorities" as const,
            title: "Task Priorities",
            description: "Define importance levels (Urgent, High, Normal, Low) for better organization.",
            icon: AlertCircle,
            category: "productivity" as const,
        },
        {
            id: "tags" as const,
            title: "Tags",
            description: "Add custom labels to tasks for easy filtering and multi-project categorization.",
            icon: Tags,
            category: "collaboration" as const,
        },
        {
            id: "nestedSubtasks" as const,
            title: "Nested Subtasks",
            description: "Break complex tasks down into smaller, manageable pieces with infinite nesting.",
            icon: Layers,
            category: "productivity" as const,
        },
        {
            id: "dependencies" as const,
            title: "Dependencies",
            description: "Link tasks together to show relationships like 'blocking' or 'waiting on'.",
            icon: LinkIcon,
            category: "advanced" as const,
        },
        {
            id: "sprintPoints" as const,
            title: "Sprint Points",
            description: "Estimate effort using agile points or time estimates for better planning.",
            icon: BarChart,
            category: "advanced" as const,
        },
        {
            id: "multipleAssignees" as const,
            title: "Multiple Assignees",
            description: "Allow more than one person to be responsible for a single task.",
            icon: CheckCircle2,
            category: "collaboration" as const,
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">ClickApps</h2>
                    <p className="text-muted-foreground mt-1">Enable or disable powerful features for your workspace.</p>
                </div>
                <Badge variant="outline" className="w-fit border-violet-600/30 text-violet-600 bg-violet-600/5 px-4 py-1 rounded-full flex gap-2 items-center">
                    <Zap className="h-3.5 w-3.5" />
                    {featureList.filter(f => flags?.[f.id]).length} Enabled
                </Badge>
            </div>

            {!isAdmin && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 font-medium">
                        Only workspace administrators can modify ClickApps. Please contact your admin for changes.
                    </p>
                </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                {featureList.map((app) => (
                    <ClickAppCard
                        key={app.id}
                        id={app.id}
                        title={app.title}
                        description={app.description}
                        icon={app.icon}
                        category={app.category}
                        enabled={!!flags?.[app.id]}
                        onToggle={handleToggle}
                        isLoading={updateFlag.isPending}
                        isAdmin={isAdmin}
                    />
                ))}
            </div>

            <div className="pt-8 border-t border-border">
                <h3 className="text-lg font-bold mb-4">Integrations</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                    {['Slack', 'GitHub', 'Google Calendar', 'Zendesk', 'Intercom', 'Zoom'].map((integration) => (
                        <div key={integration} className="flex items-center justify-between p-4 bg-accent/10 rounded-xl border border-border border-dashed hover:border-violet-600/30 transition-colors cursor-pointer group">
                            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">{integration}</span>
                            <Badge variant="outline" className="text-[9px] font-bold">Connect</Badge>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
    Building2,
    Globe,
    MapPin,
    Palette,
    Save,
    Image as ImageIcon,
    Clock,
    Calendar
} from "lucide-react";
import { type Organization, type WorkspaceSettings } from "@shared/schema";

interface OrganizationWithRole extends Organization {
    role?: string;
}

export default function WorkspaceSettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const { data: organizationData } = useQuery<OrganizationWithRole[]>({
        queryKey: ["/api/organizations"],
    });

    const org = organizationData?.[0];

    const { data: settings } = useQuery<WorkspaceSettings>({
        queryKey: ["/api/workspace/settings"],
    });

    const [name, setName] = useState(org?.name || "");
    const [accentColor, setAccentColor] = useState(org?.accentColor || "#6366F1");

    const updateOrg = useMutation({
        mutationFn: async (data: Partial<Organization>) => {
            const res = await apiRequest("PATCH", `/api/organizations/${org?.id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
            toast({ title: "Workspace updated", variant: "success" });
        },
        onError: (e: any) => toast({ title: "Failed to update", description: e?.message, variant: "destructive" }),
    });

    const handleSave = () => {
        updateOrg.mutate({ name, accentColor });
    };

    const isAdmin = (user as any).role === "admin" || (user as any).role === "owner";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Workspace Settings</h2>
                <p className="text-muted-foreground mt-1">Configure your workspace identity, branding, and defaults.</p>
            </div>

            <div className="grid gap-8">
                {/* General Info */}
                <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-violet-600" />
                        General Information
                    </h3>
                    <div className="grid gap-6 p-6 bg-card rounded-2xl border border-border shadow-sm">
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="orgName" className="text-sm font-semibold">Workspace Name</Label>
                                <Input
                                    id="orgName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={!isAdmin}
                                    className="bg-background border-border"
                                    placeholder="Acme Corp"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Branding */}
                <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Palette className="h-5 w-5 text-violet-600" />
                        Branding
                    </h3>
                    <div className="grid gap-6 p-6 bg-card rounded-2xl border border-border shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-8 items-start">
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold">Workspace Logo</Label>
                                <div className="h-24 w-24 rounded-2xl bg-accent/50 border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent transition-colors">
                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground font-medium">Upload Logo</span>
                                </div>
                            </div>
                            <div className="space-y-3 shrink-0">
                                <Label className="text-sm font-semibold">Accent Color</Label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={accentColor}
                                        onChange={(e) => setAccentColor(e.target.value)}
                                        disabled={!isAdmin}
                                        className="h-10 w-10 rounded-lg cursor-pointer border-0 bg-transparent"
                                    />
                                    <span className="text-sm font-mono text-muted-foreground uppercase">{accentColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Localization Defaults */}
                <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Globe className="h-5 w-5 text-violet-600" />
                        Localization Defaults
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-6 p-6 bg-card rounded-2xl border border-border shadow-sm">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" /> Timezone
                            </Label>
                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                <option value="UTC">UTC (Coordinated Universal Time)</option>
                                <option value="America/New_York">Eastern Time (ET)</option>
                                <option value="Europe/London">London (GMT/BST)</option>
                                <option value="Asia/Tokyo">Tokyo (JST)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" /> Date Format
                            </Label>
                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </div>
                    </div>
                </section>

                {isAdmin && (
                    <div className="flex items-center gap-3 pt-6 border-t border-border">
                        <Button
                            onClick={handleSave}
                            disabled={updateOrg.isPending}
                            className="bg-violet-600 hover:bg-violet-700 text-white min-w-[140px] shadow-lg shadow-violet-600/20"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {updateOrg.isPending ? "Saving..." : "Save Workspace"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

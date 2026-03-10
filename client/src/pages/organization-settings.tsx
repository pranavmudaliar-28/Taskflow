import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Organization, OrganizationInvitation, OrganizationMember, User, Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
    UserPlus, Mail, Shield, User as UserIcon, X, Loader2, AlertCircle,
    Clock, FolderPlus, Building2, Users, ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type OrganizationMemberWithUser = OrganizationMember & { user: Omit<User, "password"> };

/* ── helpers ──────────────────────────────────────────────── */
const ROLE_CONFIG: Record<string, { label: string; icon: any; badge: string }> = {
    admin: { label: "Admin", icon: Shield, badge: "bg-primary/10 text-primary border-primary/20" },
    team_lead: { label: "Team Lead", icon: Clock, badge: "bg-primary/10 text-primary border-primary/20" },
    member: { label: "Member", icon: UserIcon, badge: "bg-muted text-muted-foreground border-border" },
};

function RoleBadge({ role }: { role: string }) {
    const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.member;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

function MemberSkeleton() {
    return (
        <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border/50">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
        </div>
    );
}

function PageSkeleton() {
    return (
        <div className="max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b">
                <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-10 w-48 rounded-xl" />
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden h-[400px]">
                {Array(5).fill(0).map((_, i) => <MemberSkeleton key={i} />)}
            </div>
        </div>
    );
}

/* ── tabs ─────────────────────────────────────────────────── */
const TABS = [
    { id: "members", label: "Members", icon: Users },
    { id: "invitations", label: "Invitations", icon: Mail },
];

/* ── main ─────────────────────────────────────────────────── */
export default function OrganizationSettings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [tab, setTab] = useState("members");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "team_lead" | "member">("member");
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    const { data: organizations, isLoading: isLoadingOrgs, isError: orgsError, error: orgsErrorObj } = useQuery<Organization[]>({ queryKey: ["/api/organizations"] });
    const activeOrg = organizations?.[0];

    const { data: members, isLoading: isLoadingMembers } = useQuery<OrganizationMemberWithUser[]>({
        queryKey: [`/api/organizations/${activeOrg?.id}/members`],
        enabled: !!activeOrg?.id,
    });

    const { data: invitations, isLoading: isLoadingInvites } = useQuery<OrganizationInvitation[]>({
        queryKey: [`/api/organizations/${activeOrg?.id}/invitations`],
        enabled: !!activeOrg?.id,
    });

    const currentUserMember = members?.find(m => m.user.id === user?.id);
    const isCurrentUserAdmin = currentUserMember?.role === "admin";
    const activeTabs = isCurrentUserAdmin ? TABS : TABS.filter(t => t.id === "members");

    const inviteMutation = useMutation({
        mutationFn: async (data: { email: string; role: string }) => {
            const res = await apiRequest("POST", `/api/organizations/${activeOrg?.id}/invite`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/organizations/${activeOrg?.id}/invitations`] });
            queryClient.invalidateQueries({ queryKey: [`/api/organizations/${activeOrg?.id}/members`] });
            toast({ title: "Invitation sent", description: `Invite sent to ${inviteEmail}` });
            setInviteEmail(""); setIsInviteOpen(false);
        },
        onError: (err: any) => toast({ title: "Invite failed", description: err.message, variant: "destructive" }),
    });

    const revokeMemberMutation = useMutation({
        mutationFn: async (memberId: string) => {
            await apiRequest("DELETE", `/api/organizations/${activeOrg?.id}/members/${memberId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/organizations/${activeOrg?.id}/members`] });
            toast({ title: "Member removed", description: "Access revoked successfully" });
        },
    });

    if (isLoadingOrgs) return <PageSkeleton />;

    if (orgsError) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-12 gap-5 text-center">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Failed to load workspace</h2>
                <p className="text-muted-foreground max-w-sm">{orgsErrorObj instanceof Error ? orgsErrorObj.message : "An unexpected error occurred while fetching workspace data."}</p>
            </div>
            <div className="flex gap-3">
                <Button onClick={() => window.location.reload()} variant="default">Try Again</Button>
                <Button onClick={() => window.history.back()} variant="outline">Go Back</Button>
            </div>
        </div>
    );

    if (!activeOrg) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-12 gap-5 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">No active workspace found</h2>
                <p className="text-muted-foreground max-w-sm">Every user needs a workspace to manage projects and team members. Please contact support if you believe this is an error.</p>
            </div>
            <Button onClick={() => window.history.back()} variant="outline">Go Back</Button>
        </div>
    );

    return (
        <div className="max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                        <Building2 className="h-4.5 w-4.5" />
                        <span className="text-sm font-medium uppercase tracking-wider">Workspace settings</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{activeOrg.name}</h1>
                    <p className="text-muted-foreground">Manage your team members, roles, and workspace invitations</p>
                </div>

                <div className="flex items-center gap-3">
                    {isCurrentUserAdmin && (
                        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-10 px-4 gap-2 shadow-sm">
                                    <UserPlus className="h-4 w-4" />
                                    <span>Invite Member</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Invite to {activeOrg.name}</DialogTitle>
                                    <DialogDescription>Send an email invitation to join your workspace</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Email Address</Label>
                                        <Input
                                            placeholder="colleague@company.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Workspace Role</Label>
                                        <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="member">Member</SelectItem>
                                                <SelectItem value="team_lead">Team Lead</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                                    <Button
                                        disabled={!inviteEmail || inviteMutation.isPending}
                                        onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
                                    >
                                        {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invitation"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl w-full sm:w-fit overflow-x-auto">
                {activeTabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            }`}
                    >
                        <t.icon className="h-4 w-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                {tab === "members" ? (
                    <div className="divide-y divide-border/50">
                        {isLoadingMembers ? (
                            Array(5).fill(0).map((_, i) => <MemberSkeleton key={i} />)
                        ) : members?.length === 0 ? (
                            <div className="p-12 text-center">
                                <Users className="h-12 w-12 mx-auto text-muted/30 mb-4" />
                                <h3 className="font-semibold text-lg text-foreground mb-1">No members yet</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">Invite your team to start collaborating on projects and tasks</p>
                            </div>
                        ) : (
                            members?.map((m) => (
                                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-muted/30 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10 ring-2 ring-background">
                                            <AvatarImage src={m.user.profileImageUrl || undefined} />
                                            <AvatarFallback className="bg-primary/5 text-primary">
                                                {m.user.firstName?.[0]}{m.user.lastName?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-foreground tracking-tight">
                                                    {m.user.firstName} {m.user.lastName}
                                                </h4>
                                                {m.user.id === user?.id && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-bold text-muted-foreground uppercase tracking-widest">You</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{m.user.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 pl-14 sm:pl-0">
                                        <div className="flex flex-col items-start sm:items-end gap-1">
                                            <RoleBadge role={m.role} />
                                            <p className="text-[11px] text-muted-foreground/60 font-medium">Joined {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "Recently"}</p>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isCurrentUserAdmin && m.user.id !== user?.id && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm(`Remove ${m.user.firstName} from the organization?`)) {
                                                            revokeMemberMutation.mutate(m.id);
                                                        }
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {isLoadingInvites ? (
                            Array(3).fill(0).map((_, i) => <MemberSkeleton key={i} />)
                        ) : invitations?.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <Mail className="h-10 w-10 mx-auto opacity-20 mb-3" />
                                <p>No pending invitations</p>
                            </div>
                        ) : (
                            invitations?.map((inv) => (
                                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-4 p-5 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-4 w-full sm:w-auto min-w-0">
                                        <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                                            <Mail className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-foreground truncate">{inv.email}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                                <span className="capitalize shrink-0">{inv.role}</span>
                                                <span className="h-1 w-1 bg-border rounded-full shrink-0" />
                                                <span className="truncate">Sent {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "Recently"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full sm:w-auto h-9 text-muted-foreground hover:text-destructive shrink-0"
                                        onClick={async () => {
                                            await apiRequest("DELETE", `/api/organizations/${activeOrg.id}/invitations/${inv.id}`);
                                            queryClient.invalidateQueries({ queryKey: [`/api/organizations/${activeOrg.id}/invitations`] });
                                            toast({ title: "Invitation cancelled" });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

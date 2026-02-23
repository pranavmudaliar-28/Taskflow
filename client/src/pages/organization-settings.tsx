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
    UserPlus, Mail, Shield, User as UserIcon, X, Loader2,
    Clock, FolderPlus, Building2, Users, ChevronRight,
} from "lucide-react";
import { useState } from "react";
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
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

    const { data: organizations, isLoading: isLoadingOrgs } = useQuery<Organization[]>({ queryKey: ["/api/organizations"] });
    const activeOrg = organizations?.[0];

    const { data: members, isLoading: isLoadingMembers } = useQuery<OrganizationMemberWithUser[]>({
        queryKey: [`/api/organizations/${activeOrg?.id}/members`],
        enabled: !!activeOrg,
    });

    const { data: invitations, isLoading: isLoadingInvites } = useQuery<OrganizationInvitation[]>({
        queryKey: [`/api/organizations/${activeOrg?.id}/invitations`],
        enabled: !!activeOrg,
    });

    const { data: projects } = useQuery<Project[]>({
        queryKey: [`/api/organizations/${activeOrg?.id}/projects`],
        enabled: !!activeOrg,
    });

    const inviteMutation = useMutation({
        mutationFn: async (data: { email: string; role: string }) => {
            const res = await apiRequest("POST", `/api/organizations/${activeOrg?.id}/invite`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/organizations/${activeOrg?.id}/invitations`] });
            toast({ title: "Invitation sent", description: `Invite sent to ${inviteEmail}` });
            setInviteEmail(""); setIsInviteOpen(false);
        },
        onError: (e: any) => toast({ title: "Failed to send invite", description: e.message, variant: "destructive" }),
    });

    const cancelInviteMutation = useMutation({
        mutationFn: async (id: string) =>
            apiRequest("DELETE", `/api/organizations/${activeOrg?.id}/invitations/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/organizations/${activeOrg?.id}/invitations`] });
            toast({ title: "Invitation cancelled" });
        },
    });

    const assignProjectsMutation = useMutation({
        mutationFn: async ({ userId, projectIds }: { userId: string; projectIds: string[] }) =>
            apiRequest("POST", `/api/organizations/${activeOrg?.id}/members/${userId}/assign-projects`, { projectIds }),
        onSuccess: () => {
            toast({ title: "Projects assigned" });
            setIsAssignOpen(false);
        },
    });

    /* loading & empty states */
    if (isLoadingOrgs) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!activeOrg) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
                <div className="h-14 w-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
                    <Building2 className="h-7 w-7 text-muted-foreground" />
                </div>
                <h2 className="text-base font-bold text-foreground mb-1">No Organization Found</h2>
                <p className="text-sm text-muted-foreground">You're not part of any organization yet.</p>
            </div>
        );
    }

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
    };

    const currentMember = members?.find(m => m.userId === user?.id);
    const canInvite = currentMember?.role === "admin" || currentMember?.role === "team_lead";
    const pendingCount = invitations?.length || 0;

    return (
        <div className="min-h-full bg-background/50 p-6">
            <div className="max-w-4xl mx-auto">

                {/* ── Page header ── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <h1 className="text-xl font-bold text-foreground tracking-tight">{activeOrg.name}</h1>
                        </div>
                        <p className="text-sm text-muted-foreground">Manage your organization members and invitations</p>
                    </div>

                    {canInvite && (
                        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold">
                                    <UserPlus className="h-4 w-4" /> Invite member
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Invite to {activeOrg.name}</DialogTitle>
                                    <DialogDescription>
                                        Send an invitation email to join this organization.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleInvite} className="space-y-4 py-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="inv-email" className="text-sm font-semibold text-foreground/90">Email address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input id="inv-email" type="email" placeholder="name@example.com"
                                                value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                                                className="pl-9 h-10 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                required />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="inv-role" className="text-sm font-semibold text-foreground/90">Role</Label>
                                        <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                                            <SelectTrigger className="h-10 border-border focus:border-primary">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="member">Member</SelectItem>
                                                <SelectItem value="team_lead">Team Lead</SelectItem>
                                                <SelectItem value="admin">Administrator</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <DialogFooter className="pt-2">
                                        <Button variant="outline" type="button" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                                        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                            disabled={inviteMutation.isPending || !inviteEmail}>
                                            {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            Send invite
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* ── Tab nav ── */}
                <div className="flex items-center gap-1 bg-card rounded-xl border border-border p-1.5 shadow-sm w-fit mb-5">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setTab(id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}>
                            <Icon className={`h-4 w-4 ${tab === id ? "text-primary" : "text-muted-foreground"}`} />
                            {label}
                            {id === "invitations" && pendingCount > 0 && (
                                <span className="ml-1 h-5 min-w-[20px] px-1.5 bg-primary text-primary-foreground rounded-full text-xs font-bold flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Members tab ── */}
                {tab === "members" && (
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-foreground">Organization Members</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {members?.length ?? 0} member{members?.length !== 1 ? "s" : ""} with access
                                </p>
                            </div>
                        </div>

                        {isLoadingMembers ? (
                            Array.from({ length: 4 }).map((_, i) => <MemberSkeleton key={i} />)
                        ) : members?.length === 0 ? (
                            <div className="py-16 text-center">
                                <Users className="h-10 w-10 text-muted/20 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No members yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {members?.map((member) => {
                                    const name = member.user.firstName && member.user.lastName
                                        ? `${member.user.firstName} ${member.user.lastName}`
                                        : member.user.email || "Unknown";
                                    const initials = member.user.firstName && member.user.lastName
                                        ? `${member.user.firstName[0]}${member.user.lastName[0]}`.toUpperCase()
                                        : (member.user.email?.[0]?.toUpperCase() || "?");

                                    return (
                                        <div key={member.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors">
                                            <Avatar className="h-9 w-9 shrink-0">
                                                <AvatarImage src={member.user.profileImageUrl || undefined} />
                                                <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <RoleBadge role={member.role} />
                                                {canInvite && (
                                                    <Button variant="ghost" size="sm"
                                                        className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                                                        onClick={() => {
                                                            setSelectedMemberId(member.userId);
                                                            setSelectedProjectIds([]);
                                                            setIsAssignOpen(true);
                                                        }}>
                                                        <FolderPlus className="h-3.5 w-3.5" />
                                                        Assign
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Invitations tab ── */}
                {tab === "invitations" && (
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-border">
                            <h2 className="text-sm font-bold text-foreground">Pending Invitations</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Links expire after 7 days</p>
                        </div>

                        {isLoadingInvites ? (
                            Array.from({ length: 3 }).map((_, i) => <MemberSkeleton key={i} />)
                        ) : !invitations || invitations.length === 0 ? (
                            <div className="py-16 text-center">
                                <Mail className="h-10 w-10 text-muted/20 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-muted-foreground mb-1">No pending invitations</p>
                                <p className="text-xs text-muted-foreground">Invite a teammate to get started</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {invitations.map((invite) => (
                                    <div key={invite.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50">
                                        <div className="h-9 w-9 bg-warning/10 rounded-full flex items-center justify-center shrink-0">
                                            <Mail className="h-4 w-4 text-warning" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{invite.email}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Invited as <span className="capitalize">{invite.role.replace("_", " ")}</span>
                                                {" · "}{new Date(invite.createdAt!).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs font-medium text-warning bg-warning/10 border border-warning/20 px-2.5 py-1 rounded-full">
                                                Pending
                                            </span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => cancelInviteMutation.mutate(invite.id)}
                                                disabled={cancelInviteMutation.isPending}
                                                aria-label="Cancel invitation">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Assign Projects Dialog ── */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Projects</DialogTitle>
                        <DialogDescription>Select the projects this member should have access to.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-72 overflow-y-auto py-2 space-y-1">
                        {projects && projects.length > 0 ? (
                            projects.map((project) => (
                                <label key={project.id}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                                    <Checkbox
                                        id={`proj-${project.id}`}
                                        checked={selectedProjectIds.includes(project.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedProjectIds(prev =>
                                                checked ? [...prev, project.id] : prev.filter(id => id !== project.id)
                                            );
                                        }}
                                    />
                                    <span className="text-sm text-foreground/90 font-medium">{project.name}</span>
                                </label>
                            ))
                        ) : (
                            <p className="text-center text-sm text-muted-foreground py-6">No projects available</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() => {
                                if (selectedMemberId) {
                                    assignProjectsMutation.mutate({ userId: selectedMemberId, projectIds: selectedProjectIds });
                                }
                            }}
                            disabled={assignProjectsMutation.isPending || !selectedMemberId}>
                            {assignProjectsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

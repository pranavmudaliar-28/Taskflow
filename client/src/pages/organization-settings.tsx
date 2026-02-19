import { useQuery, useMutation } from "@tanstack/react-query";
import { Organization, OrganizationInvitation, OrganizationMember, User, Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UserPlus, Mail, Shield, User as UserIcon, X, Loader2, Check, Clock, FolderPlus } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type OrganizationMemberWithUser = OrganizationMember & { user: Omit<User, 'password'> };

export default function OrganizationSettings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "team_lead" | "member">("member");
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

    // For now, assume we're managing the first organization the user is in
    const { data: organizations, isLoading: isLoadingOrgs } = useQuery<Organization[]>({
        queryKey: ["/api/organizations"],
    });

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
            toast({ title: "Invitation sent", description: `An invite has been sent to ${inviteEmail}` });
            setInviteEmail("");
            setIsInviteDialogOpen(false);
        },
        onError: (error: any) => {
            toast({
                title: "Failed to send invitation",
                description: error.message || "An unexpected error occurred",
                variant: "destructive",
            });
        },
    });

    const cancelInviteMutation = useMutation({
        mutationFn: async (inviteId: string) => {
            await apiRequest("DELETE", `/api/organizations/${activeOrg?.id}/invitations/${inviteId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/organizations/${activeOrg?.id}/invitations`] });
            toast({ title: "Invitation cancelled" });
        },
    });

    const assignProjectsMutation = useMutation({
        mutationFn: async ({ userId, projectIds }: { userId: string; projectIds: string[] }) => {
            await apiRequest("POST", `/api/organizations/${activeOrg?.id}/members/${userId}/assign-projects`, { projectIds });
        },
        onSuccess: () => {
            toast({ title: "Projects assigned successfully" });
            setIsAssignDialogOpen(false);
        },
    });

    if (isLoadingOrgs) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!activeOrg) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-semibold">No Organization Found</h2>
                <p className="text-muted-foreground">You don't seem to be part of any organization yet.</p>
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

    return (
        <div className="container mx-auto py-8 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{activeOrg.name}</h1>
                    <p className="text-muted-foreground">Manage your organization members and invitations.</p>
                </div>
                {canInvite && (
                    <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Invite Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invite to Organization</DialogTitle>
                                <DialogDescription>
                                    Send an invitation email to someone to join {activeOrg.name}.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleInvite} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={inviteRole}
                                        onValueChange={(value: any) => setInviteRole(value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="member">Member</SelectItem>
                                            <SelectItem value="team_lead">Team Lead</SelectItem>
                                            <SelectItem value="admin">Administrator</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="submit"
                                        disabled={inviteMutation.isPending || !inviteEmail}
                                    >
                                        {inviteMutation.isPending && (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        )}
                                        Send Invitation
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Tabs defaultValue="members" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="invitations">
                        Pending Invitations
                        {invitations && invitations.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {invitations.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="members">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organization Members</CardTitle>
                            <CardDescription>
                                All users who currently have access to this organization.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingMembers ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : members?.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    No members found.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {members?.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={member.user.profileImageUrl || undefined} />
                                                    <AvatarFallback>
                                                        {member.user.firstName?.[0]}
                                                        {member.user.lastName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">
                                                        {member.user.firstName && member.user.lastName
                                                            ? `${member.user.firstName} ${member.user.lastName}`
                                                            : (member.user.email || "Unknown User")}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {member.user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                                                    {member.role === "admin" ? (
                                                        <Shield className="h-3 w-3 mr-1" />
                                                    ) : member.role === "team_lead" ? (
                                                        <Clock className="h-3 w-3 mr-1" />
                                                    ) : (
                                                        <UserIcon className="h-3 w-3 mr-1" />
                                                    )}
                                                    {member.role.replace("_", " ")}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedMemberId(member.userId);
                                                        setSelectedProjectIds([]); // In a real app, we'd fetch current projects
                                                        setIsAssignDialogOpen(true);
                                                    }}
                                                >
                                                    <FolderPlus className="h-4 w-4 mr-2" />
                                                    Assign Projects
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invitations">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Invitations</CardTitle>
                            <CardDescription>
                                Invitations that haven't been accepted yet. Links expire after 7 days.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingInvites ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : !invitations || invitations.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>No pending invitations.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {invitations.map((invite) => (
                                        <div
                                            key={invite.id}
                                            className="flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{invite.email}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Invited as {invite.role.replace("_", " ")} •{" "}
                                                        {new Date(invite.createdAt!).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    Pending
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => cancelInviteMutation.mutate(invite.id)}
                                                    disabled={cancelInviteMutation.isPending}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Projects</DialogTitle>
                        <DialogDescription>
                            Select projects to assign this member to.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[400px] overflow-y-auto px-1">
                        {projects && projects.length > 0 ? (
                            projects.map((project) => (
                                <div key={project.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`project-${project.id}`}
                                        checked={selectedProjectIds.includes(project.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedProjectIds([...selectedProjectIds, project.id]);
                                            } else {
                                                setSelectedProjectIds(selectedProjectIds.filter(id => id !== project.id));
                                            }
                                        }}
                                    />
                                    <Label htmlFor={`project-${project.id}`} className="flex-1 cursor-pointer">
                                        {project.name}
                                    </Label>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No projects available.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                if (selectedMemberId) {
                                    assignProjectsMutation.mutate({
                                        userId: selectedMemberId,
                                        projectIds: selectedProjectIds
                                    });
                                }
                            }}
                            disabled={assignProjectsMutation.isPending || !selectedMemberId}
                        >
                            {assignProjectsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Assignments
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Mail, Loader2, Shield, ShieldCheck, User as UserIcon } from "lucide-react";
import type { User } from "@shared/models/auth";
import type { ProjectInvitation, Role } from "@shared/schema";

type ProjectMemberWithUser = {
  id: string;
  projectId: string;
  userId: string;
  role: Role;
  addedAt: string | null;
  user: Omit<User, 'password'>;
};

interface ProjectMembersDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  memberData: ProjectMemberWithUser[];
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  team_lead: "Team Lead",
  member: "Member",
};

const ROLE_ICONS: Record<Role, typeof Shield> = {
  admin: ShieldCheck,
  team_lead: Shield,
  member: UserIcon,
};

export function ProjectMembersDialog({ open, onClose, projectId, memberData }: ProjectMembersDialogProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");

  const currentUserRole = useMemo(() => {
    if (!currentUser) return null;
    const myMembership = memberData.find(m => m.userId === currentUser.id);
    return myMembership?.role || null;
  }, [memberData, currentUser]);

  const isAdmin = currentUserRole === "admin";

  const { data: invitations = [] } = useQuery<ProjectInvitation[]>({
    queryKey: ["/api/projects", projectId, "invitations"],
    enabled: open,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: Role }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/invite`, { email, role });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.status === "added") {
        toast({ title: `${data.user.email} has been added to the project` });
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      } else {
        toast({ title: `Invitation sent to ${data.email}` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "invitations"] });
      setInviteEmail("");
      setInviteRole("member");
    },
    onError: (error: Error) => {
      const message = error.message.includes(":") ? error.message.split(": ").slice(1).join(": ") : error.message;
      try {
        const parsed = JSON.parse(message);
        toast({ title: parsed.message || "Failed to invite", variant: "destructive" });
      } catch {
        toast({ title: message || "Failed to invite", variant: "destructive" });
      }
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: Role }) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}/members/${memberId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Role updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
    },
    onError: (error: Error) => {
      const message = error.message.includes(":") ? error.message.split(": ").slice(1).join(": ") : error.message;
      try {
        const parsed = JSON.parse(message);
        toast({ title: parsed.message || "Failed to update role", variant: "destructive" });
      } catch {
        toast({ title: message || "Failed to update role", variant: "destructive" });
      }
    },
  });

  const getInitials = (user: Omit<User, 'password'>) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email?.[0].toUpperCase() || "?";
  };

  const getMemberName = (user: Omit<User, 'password'>) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || "Unknown";
  };

  const handleInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (memberData.some(m => m.user.email?.toLowerCase() === email)) {
      toast({ title: "This person is already a member", variant: "destructive" });
      return;
    }
    inviteMutation.mutate({ email, role: inviteRole });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Project Members</DialogTitle>
          <DialogDescription>
            Manage who has access to this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Invite by email..."
                  className="pl-9"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  disabled={inviteMutation.isPending}
                  data-testid="input-invite-email"
                />
              </div>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger className="w-[120px]" data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                size="sm"
                data-testid="button-send-invite"
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Invite
              </Button>
            </div>
          </div>

          <Separator />

          <ScrollArea className="max-h-[350px]">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Current members ({memberData.length})
              </p>
              {memberData.length === 0 ? (
                <div className="text-center py-6">
                  <UserPlus className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No members yet</p>
                </div>
              ) : (
                memberData.map((member) => {
                  const RoleIcon = ROLE_ICONS[member.role];
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/30"
                      data-testid={`member-item-${member.userId}`}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.user.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(member.user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{getMemberName(member.user)}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                      </div>
                      {isAdmin ? (
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => updateRoleMutation.mutate({ memberId: member.userId, role: newRole as Role })}
                        >
                          <SelectTrigger className="w-[120px]" data-testid={`select-role-${member.userId}`}>
                            <div className="flex items-center gap-1.5">
                              <RoleIcon className="h-3 w-3" />
                              <span>{ROLE_LABELS[member.role]}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="team_lead">Team Lead</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-role-${member.userId}`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {ROLE_LABELS[member.role]}
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}

              {invitations.length > 0 && (
                <>
                  <p className="text-sm font-medium text-muted-foreground mt-4">
                    Pending invitations ({invitations.length})
                  </p>
                  {invitations.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/30"
                      data-testid={`invite-item-${invite.email}`}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 text-sm">
                          {invite.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{invite.email}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        {invite.role ? ROLE_LABELS[invite.role as Role] : "Member"} (Invited)
                      </Badge>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

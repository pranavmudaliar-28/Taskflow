import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Mail, Loader2 } from "lucide-react";
import type { User } from "@shared/models/auth";
import type { ProjectInvitation } from "@shared/schema";

interface ProjectMembersDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members: User[];
}

export function ProjectMembersDialog({ open, onClose, projectId, members }: ProjectMembersDialogProps) {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: invitations = [] } = useQuery<ProjectInvitation[]>({
    queryKey: ["/api/projects", projectId, "invitations"],
    enabled: open,
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/invite`, { email });
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

  const getInitials = (member: User) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
    }
    return member.email?.[0].toUpperCase() || "?";
  };

  const getMemberName = (member: User) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    return member.email || "Unknown";
  };

  const handleInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (members.some(m => m.email?.toLowerCase() === email)) {
      toast({ title: "This person is already a member", variant: "destructive" });
      return;
    }
    inviteMutation.mutate(email);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Project Members</DialogTitle>
          <DialogDescription>
            Manage who has access to this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
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

          <Separator />

          <ScrollArea className="max-h-[350px]">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Current members ({members.length})
              </p>
              {members.length === 0 ? (
                <div className="text-center py-6">
                  <UserPlus className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No members yet</p>
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/30"
                    data-testid={`member-item-${member.id}`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.profileImageUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{getMemberName(member)}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Member
                    </Badge>
                  </div>
                ))
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
                        Invited
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

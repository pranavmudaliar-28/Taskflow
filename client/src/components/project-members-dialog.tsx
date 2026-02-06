import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Mail, Send } from "lucide-react";
import type { User } from "@shared/models/auth";

interface ProjectMembersDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members: User[];
}

export function ProjectMembersDialog({ open, onClose, projectId, members }: ProjectMembersDialogProps) {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

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
    if (invitedEmails.includes(email)) {
      toast({ title: "Invitation already sent to this email", variant: "destructive" });
      return;
    }
    setInvitedEmails(prev => [...prev, email]);
    setInviteEmail("");
    toast({ title: `Invitation sent to ${email}` });
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
                data-testid="input-invite-email"
              />
            </div>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail.trim()}
              data-testid="button-send-invite"
            >
              <UserPlus className="h-4 w-4 mr-2" />
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

              {invitedEmails.length > 0 && (
                <>
                  <p className="text-sm font-medium text-muted-foreground mt-4">
                    Pending invitations ({invitedEmails.length})
                  </p>
                  {invitedEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/30"
                      data-testid={`invite-item-${email}`}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 text-sm">
                          {email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{email}</p>
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

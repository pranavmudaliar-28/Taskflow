import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Loader2, Shield, ShieldCheck, User as UserIcon, Check, ChevronsUpDown, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");

  const currentUserRole = useMemo(() => {
    if (!currentUser) return null;
    const myMembership = memberData.find(m => m.userId === currentUser.id);
    return myMembership?.role || null;
  }, [memberData, currentUser]);

  const isAdmin = currentUserRole === "admin";

  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Fetch organization members - use server search if typing, otherwise fetch all (or limit)
  const { data: orgMembers = [], isLoading: isLoadingMembers } = useQuery<Array<{ userId: string; user: Omit<User, 'password'>; role: Role }>>({
    queryKey: debouncedSearch.length > 1
      ? ["/api/organizations/members/search", debouncedSearch]
      : ["/api/organizations/members"],
    queryFn: async ({ queryKey }) => {
      const [endpoint, q] = queryKey;
      if (endpoint.includes("search")) {
        const res = await apiRequest("GET", `${endpoint}?q=${q}`);
        return res.json();
      }
      const res = await apiRequest("GET", endpoint as string);
      return res.json();
    },
    enabled: open && isAdmin,
  });

  // Filter out users who are already project members
  const availableOrgMembers = useMemo(() => {
    if (!orgMembers?.length) return [];
    const projectMemberIds = new Set(memberData.map(m => m.userId));
    return orgMembers.filter(om => !projectMemberIds.has(om.userId));
  }, [orgMembers, memberData]);

  const filteredOrgMembers = availableOrgMembers;

  const { data: invitations = [], isLoading: isLoadingInvitations, isError: isInvitationsError } = useQuery<ProjectInvitation[]>({
    queryKey: ["/api/projects", projectId, "invitations"],
    enabled: open,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/members`, { userId, role });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Member added to project" });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      setOpenCombobox(false);
      setSearchValue("");
    },
    onError: (error: Error) => {
      const message = error.message.includes(":") ? error.message.split(": ").slice(1).join(": ") : error.message;
      try {
        const parsed = JSON.parse(message);
        toast({ title: parsed.message || "Failed to add member", variant: "destructive" });
      } catch {
        toast({ title: message || "Failed to add member", variant: "destructive" });
      }
    },
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
      setSearchValue("");
      setOpenCombobox(false);
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
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      // Note: This endpoint might need to be verified or created if not exists.
      // The current routes don't show DELETE /api/projects/:id/invitations/:inviteId
      // I'll skip implementing the delete call for now to avoid breaking changes if route missing
      // But UI could support it if route existed.
      // For now, I won't add the delete button to avoid confusing user if it fails.
    }
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

  const isEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };


  const handleSelectMember = (userId: string) => {
    addMemberMutation.mutate({ userId, role: inviteRole });
  };

  const handleSelectEmail = (email: string) => {
    inviteMutation.mutate({ email, role: inviteRole });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[550px] flex flex-col max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">Project Members</DialogTitle>
          <DialogDescription>
            Manage access and roles for this project.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pb-0">
          <div className="flex gap-3">
            <div className="flex-1">
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between h-10 px-3 bg-muted/40 font-normal text-muted-foreground hover:text-foreground text-left border-dashed"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <UserPlus className="h-4 w-4 shrink-0 opacity-50" />
                      <span className="truncate">
                        {searchValue ? searchValue : "Search name or invite by email..."}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search members or email..."
                      value={searchValue}
                      onValueChange={setSearchValue}
                      className="h-10"
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isEmail(searchValue) ? (
                          <div className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => handleSelectEmail(searchValue)}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                <Mail className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">Invite via email</span>
                                <span className="text-xs text-muted-foreground">Send invitation to <strong>{searchValue}</strong></span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-center py-6 text-muted-foreground">
                            No members found. Type an email to invite.
                          </p>
                        )}
                      </CommandEmpty>

                      {filteredOrgMembers.length > 0 && (
                        <CommandGroup heading="Organization Members">
                          {filteredOrgMembers.map((member) => (
                            <CommandItem
                              key={member.userId}
                              value={member.userId}
                              onSelect={() => handleSelectMember(member.userId)}
                              className="flex items-center gap-2 cursor-pointer py-2"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={member.user.profileImageUrl || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(member.user)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{getMemberName(member.user)}</span>
                                <span className="text-xs text-muted-foreground">{member.user.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {isEmail(searchValue) && filteredOrgMembers.length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading="New Invitation">
                            <CommandItem value={searchValue} onSelect={() => handleSelectEmail(searchValue)} className="py-2">
                              <Mail className="h-4 w-4 mr-2" />
                              <span>Invite <strong>{searchValue}</strong></span>
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
              <SelectTrigger className="w-[120px] h-10 bg-muted/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="team_lead">Team Lead</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            {(addMemberMutation.isPending || inviteMutation.isPending) && (
              <div className="flex items-center justify-center h-10 w-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>

        <Separator className="my-4 mb-0" />

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Active Members Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Project Members ({memberData.length})</h4>
              </div>

              <div className="space-y-3">
                {memberData.length === 0 ? (
                  <div className="text-center py-10 border rounded-lg border-dashed bg-muted/20">
                    <UserPlus className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No members in this project yet.</p>
                  </div>
                ) : (
                  memberData.map((member) => {
                    const RoleIcon = ROLE_ICONS[member.role];
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={member.user.profileImageUrl || undefined} />
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
                              {getInitials(member.user)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{getMemberName(member.user)}</p>
                              {member.userId === currentUser?.id && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-normal">You</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                          </div>
                        </div>

                        {isAdmin ? (
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => updateRoleMutation.mutate({ memberId: member.userId, role: newRole as Role })}
                            disabled={member.userId === currentUser?.id}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs border-transparent hover:border-input focus:ring-0 transition-colors bg-transparent hover:bg-muted/50">
                              <div className="flex items-center gap-1.5">
                                <RoleIcon className="h-3.5 w-3.5 text-muted-foreground" />
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
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1">
                            <RoleIcon className="h-3.5 w-3.5" />
                            {ROLE_LABELS[member.role]}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pending Invitations Section */}
            {(isLoadingInvitations || invitations.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Pending Invitations</h4>
                  <Badge variant="outline" className="text-[10px] px-1.5 h-4">{invitations.length}</Badge>
                </div>

                <div className="space-y-2">
                  {isLoadingInvitations ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    invitations.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-md border border-amber-100 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-500">
                            <Mail className="h-4 w-4" />
                          </div>
                          <div className="flex-col flex min-w-0">
                            <p className="text-sm font-medium truncate">{invite.email}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Invited as {ROLE_LABELS[invite.role as Role || "member"]}</span>
                              <span>•</span>
                              <span className="text-amber-600 dark:text-amber-500">Pending</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

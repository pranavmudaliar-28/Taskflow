import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import {
    Hash, Users, MessageSquare, Plus, Building2, ChevronDown, ChevronRight, FolderOpen,
} from "lucide-react";
import type { Channel } from "@shared/schema";

interface ChatSidebarProps {
    activeChannelId: string | null;
    onSelectChannel: (id: string) => void;
    onlineUsers: Record<string, boolean>;
    currentUserId: string;
}

export function ChatSidebar({
    activeChannelId, onSelectChannel, onlineUsers, currentUserId
}: ChatSidebarProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [dmSearch, setDmSearch] = useState("");
    const [showDmSearch, setShowDmSearch] = useState(false);
    const [expandOrg, setExpandOrg] = useState(true);
    const [expandProjects, setExpandProjects] = useState(true);
    const [expandDMs, setExpandDMs] = useState(true);
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [newChannelProjectId, setNewChannelProjectId] = useState("");

    const { data: channels = [] } = useQuery<Channel[]>({
        queryKey: ["/api/channels"],
    });

    const { data: orgMembers = [] } = useQuery<any[]>({
        queryKey: ["/api/organizations/members"],
        staleTime: 60_000,
    });

    const { data: organizations } = useQuery<any[]>({
        queryKey: ["/api/organizations"],
    });
    const organization = organizations?.[0];

    const { data: projects = [] } = useQuery<any[]>({
        queryKey: organization?.id ? [`/api/organizations/${organization.id}/projects`] : [],
        enabled: !!organization?.id,
    });

    // ── Create DM ──────────────────────────────────────────────────────────
    const createDmMutation = useMutation({
        mutationFn: async (targetUserId: string) => {
            const res = await apiRequest("POST", "/api/channels/direct", {
                targetUserId,
                organizationId: organization?.id || "",
            });
            return res.json();
        },
        onSuccess: (channel) => {
            queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
            onSelectChannel(channel.id);
            setShowDmSearch(false);
            setDmSearch("");
        },
    });

    // ── Create Project Channel ─────────────────────────────────────────────
    const createProjectChannelMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/channels/project", {
                name: newChannelName.trim(),
                projectId: newChannelProjectId || undefined,
                organizationId: organization?.id || "",
            });
            return res.json();
        },
        onSuccess: (channel) => {
            queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
            onSelectChannel(channel.id);
            setShowCreateProject(false);
            setNewChannelName("");
            setNewChannelProjectId("");
        },
    });

    const orgChannels = channels.filter((c) => c.type === "org");
    const projectChannels = channels.filter((c) => c.type === "project");
    const dmChannels = channels.filter((c) => c.type === "direct");

    const getOtherMemberId = (ch: Channel) => ch.memberIds?.find((id) => id !== currentUserId);

    const getMemberName = (userId: string) => {
        const m = (orgMembers as any[]).find((m) => m.userId === userId || m.user?.id === userId);
        if (!m) return userId.slice(0, 8);
        const u = m.user || m;
        return u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : (u.email || userId.slice(0, 8));
    };

    const getUserInitials = (userId: string) => getMemberName(userId).slice(0, 2).toUpperCase();

    const filteredMembers = (orgMembers as any[]).filter((m) => {
        const u = m.user || m;
        const name = u.firstName ? `${u.firstName} ${u.lastName || ""}` : u.email;
        return name?.toLowerCase().includes(dmSearch.toLowerCase()) &&
            (u.id || m.userId) !== currentUserId;
    });

    // ── Sub-components ─────────────────────────────────────────────────────
    const ChannelItem = ({ channel }: { channel: Channel }) => {
        const isActive = channel.id === activeChannelId;
        const otherId = channel.type === "direct" ? getOtherMemberId(channel) : undefined;
        return (
            <button
                onClick={() => onSelectChannel(channel.id)}
                className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all text-left group/item",
                    isActive
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
            >
                {channel.type === "direct" ? (
                    <div className="relative shrink-0">
                        <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[9px]">
                                {getUserInitials(otherId || "")}
                            </AvatarFallback>
                        </Avatar>
                        {onlineUsers[otherId || ""] && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-background" />
                        )}
                    </div>
                ) : (
                    <Hash className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate flex-1">
                    {channel.type === "direct"
                        ? getMemberName(otherId || "")
                        : (channel.name || "channel")}
                </span>
                {channel.type === "direct" && onlineUsers[otherId || ""] && (
                    <span className="text-[9px] text-emerald-500 shrink-0">●</span>
                )}
            </button>
        );
    };

    const SectionHeader = ({
        label, icon: Icon, expanded, onToggle, onAdd,
    }: {
        label: string;
        icon: any;
        expanded: boolean;
        onToggle: () => void;
        onAdd?: () => void;
    }) => (
        <div className="flex items-center justify-between px-2 py-1 group">
            <button
                onClick={onToggle}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Icon className="w-3 h-3" />
                {label}
            </button>
            {onAdd && (
                <button
                    onClick={onAdd}
                    className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    title={`Add ${label}`}
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );

    return (
        <>
            <div className="w-64 shrink-0 flex flex-col border-r border-border/50 bg-card/40 backdrop-blur-sm">
                {/* Header */}
                <div className="px-4 py-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <MessageSquare className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">Messages</span>
                    </div>
                </div>

                <ScrollArea className="flex-1 px-2 py-3">
                    <div className="space-y-4">
                        {/* Org Channels */}
                        {orgChannels.length > 0 && (
                            <div className="space-y-0.5">
                                <SectionHeader
                                    label="Organization"
                                    icon={Building2}
                                    expanded={expandOrg}
                                    onToggle={() => setExpandOrg(!expandOrg)}
                                />
                                {expandOrg && orgChannels.map((ch) => (
                                    <ChannelItem key={ch.id} channel={ch} />
                                ))}
                            </div>
                        )}

                        {/* Project Channels */}
                        <div className="space-y-0.5">
                            <SectionHeader
                                label="Projects"
                                icon={FolderOpen}
                                expanded={expandProjects}
                                onToggle={() => setExpandProjects(!expandProjects)}
                                onAdd={() => setShowCreateProject(true)}
                            />
                            {expandProjects && projectChannels.map((ch) => (
                                <ChannelItem key={ch.id} channel={ch} />
                            ))}
                            {expandProjects && projectChannels.length === 0 && (
                                <p className="text-[11px] text-muted-foreground px-4 py-1">
                                    No project channels yet
                                </p>
                            )}
                        </div>

                        {/* Direct Messages */}
                        <div className="space-y-0.5">
                            <SectionHeader
                                label="Direct Messages"
                                icon={Users}
                                expanded={expandDMs}
                                onToggle={() => setExpandDMs(!expandDMs)}
                                onAdd={() => setShowDmSearch(!showDmSearch)}
                            />
                            {showDmSearch && (
                                <div className="px-1 pb-1">
                                    <Input
                                        value={dmSearch}
                                        onChange={(e) => setDmSearch(e.target.value)}
                                        placeholder="Search members…"
                                        className="h-7 text-xs"
                                        autoFocus
                                    />
                                    {dmSearch && (
                                        <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                                            {filteredMembers.length === 0 ? (
                                                <p className="text-[11px] text-muted-foreground px-2 py-1">No members found</p>
                                            ) : filteredMembers.map((m) => {
                                                const u = m.user || m;
                                                const uid = u.id || m.userId;
                                                return (
                                                    <button
                                                        key={uid}
                                                        onClick={() => createDmMutation.mutate(uid)}
                                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-left"
                                                    >
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarFallback className="text-[9px]">
                                                                {(u.firstName?.[0] || u.email?.[0] || "?").toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="truncate flex-1">
                                                            {u.firstName ? `${u.firstName} ${u.lastName || ""}` : u.email}
                                                        </span>
                                                        {onlineUsers[uid] && (
                                                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                            {expandDMs && dmChannels.map((ch) => (
                                <ChannelItem key={ch.id} channel={ch} />
                            ))}
                        </div>
                    </div>
                </ScrollArea>

                {/* User footer */}
                <div className="px-3 py-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Avatar className="h-7 w-7">
                                <AvatarImage src={user?.profileImageUrl || undefined} />
                                <AvatarFallback className="text-[10px]">
                                    {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{user?.firstName || user?.email}</p>
                            <p className="text-[10px] text-emerald-500">Online</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Project Channel Dialog */}
            <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Create Project Channel</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel Name</label>
                            <Input
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                placeholder="e.g. backend-team"
                                autoFocus
                            />
                        </div>
                        {projects.length > 0 && (
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Link to Project (optional)</label>
                                <select
                                    value={newChannelProjectId}
                                    onChange={(e) => setNewChannelProjectId(e.target.value)}
                                    className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background"
                                >
                                    <option value="">No project</option>
                                    {projects.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateProject(false)}>Cancel</Button>
                        <Button
                            onClick={() => createProjectChannelMutation.mutate()}
                            disabled={!newChannelName.trim() || createProjectChannelMutation.isPending}
                        >
                            {createProjectChannelMutation.isPending ? "Creating…" : "Create Channel"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

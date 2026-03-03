import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useChatWs } from "@/hooks/use-chat-ws";
import { useWebRTC } from "@/hooks/use-webrtc";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ThreadPanel } from "@/components/chat/ThreadPanel";
import { CallOverlay } from "@/components/chat/CallOverlay";
import { ActiveCallBar } from "@/components/chat/ActiveCallBar";
import { AiSummaryCard } from "@/components/chat/AiSummaryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams, useLocation } from "wouter";
import {
    Hash, Users, Video, Phone, Search, X, Sparkles, Loader2
} from "lucide-react";
import type { Channel, Message } from "@shared/schema";

export default function ChatPage() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const params = useParams<{ channelId?: string }>();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(params.channelId || null);
    const [threadMessage, setThreadMessage] = useState<Message | null>(null);
    const [showAiSummary, setShowAiSummary] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    // Keep a live ref to activeChannelId to avoid stale closures in callbacks
    const activeChannelIdRef = useRef<string | null>(activeChannelId);
    useEffect(() => { activeChannelIdRef.current = activeChannelId; }, [activeChannelId]);
    // allMessages ref for deduplicate check without stale closure
    const setAllMessagesRef = useRef<React.Dispatch<React.SetStateAction<Message[]>> | null>(null);

    const queryClient = useQueryClient();

    // WebRTC hook
    const webrtc = useWebRTC({
        sendSignal: (event) => chatWs._sendRaw(event),
        currentUserId: user?.id || "",
    });

    // Chat WS hook — onMessage handles both signaling AND new messages for active channel
    const chatWs = useChatWs({
        onMessage: (event) => {
            // Forward signaling events to WebRTC
            webrtc.handleSignalingEvent(event);
            // Append new messages directly to local state (use ref to avoid stale closure)
            if (event.type === "message:new") {
                const msg = event.payload as Message;
                if (msg.channelId === activeChannelIdRef.current) {
                    setAllMessages((prev) => {
                        if (prev.some((m) => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                }
            }
        },
    });
    // Keep the setter ref live
    useEffect(() => { setAllMessagesRef.current = setAllMessages; }, []);

    // Subscribe to the active channel
    useEffect(() => {
        if (activeChannelId) {
            chatWs.joinChannel(activeChannelId);
            setLocation(`/chat/${activeChannelId}`);
        }
        return () => {
            if (activeChannelId) chatWs.leaveChannel(activeChannelId);
        };
    }, [activeChannelId]);

    // Active channel data
    const { data: activeChannel } = useQuery<Channel>({
        queryKey: [`/api/channels/${activeChannelId}`],
        enabled: !!activeChannelId,
    });

    // Fetch org members to resolve DM partner names
    const { data: orgMembers } = useQuery<any[]>({
        queryKey: ["/api/organizations/members"],
        staleTime: 60_000,
    });

    // Messages — manual cursor-based pagination
    const [cursor, setCursor] = useState<string | null>(null);
    const [allMessages, setAllMessages] = useState<Message[]>([]);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);

    const { data: messagesData, isLoading: messagesLoading } = useQuery<{
        messages: Message[];
        nextCursor: string | null;
    }>({
        queryKey: [`/api/channels/${activeChannelId}/messages`, cursor],
        enabled: !!activeChannelId,
    });

    // Merge newly fetched page into allMessages when data changes
    useEffect(() => {
        if (!messagesData) return;

        // The API returns messages sorted by createdAt: -1 (newest first).
        // To display them naturally (oldest at top, newest at bottom), reverse the page.
        const reversedPage = [...messagesData.messages].reverse();

        if (cursor === null) {
            setAllMessages(reversedPage);
        } else {
            setAllMessages((prev) => {
                const newMessages = reversedPage.filter(
                    (newMsg) => !prev.some((pMsg) => pMsg.id === newMsg.id)
                );
                return [...newMessages, ...prev];
            });
        }
        setHasMoreMessages(!!messagesData.nextCursor);
    }, [messagesData, cursor]);

    // Reset when channel changes
    useEffect(() => {
        setCursor(null);
        setAllMessages([]);
        setHasMoreMessages(false);
        setIsSearching(false);
        setSearchQuery("");
        setSearchResults([]);
    }, [activeChannelId]);

    const handleLoadMore = useCallback(() => {
        if (messagesData?.nextCursor) setCursor(messagesData.nextCursor);
    }, [messagesData?.nextCursor]);

    const messages = allMessages;

    // ── DM partner resolution ─────────────────────────────────────────────────
    const dmPartnerId = activeChannel?.type === "direct"
        ? activeChannel.memberIds?.find((id) => id !== user?.id) || null
        : null;

    const dmPartner = orgMembers?.find((m: any) => m.user?.id === dmPartnerId || m.userId === dmPartnerId);
    const dmPartnerUser: any = dmPartner?.user ?? dmPartner;
    const dmPartnerName = dmPartnerUser
        ? `${dmPartnerUser.firstName || ""} ${dmPartnerUser.lastName || ""}`.trim()
        : "Direct Message";
    const isDmOnline = dmPartnerId ? !!chatWs.onlineUsers[dmPartnerId] : false;

    const getChannelTitle = () => {
        if (!activeChannel) return "Select a channel";
        if (activeChannel.type === "direct") return dmPartnerName;
        return activeChannel.name || "Channel";
    };

    const getChannelSubtitle = () => {
        if (!activeChannel) return "";
        if (activeChannel.type === "direct") {
            return isDmOnline ? "Online" : "Offline";
        }
        return `${activeChannel.memberIds?.length || 0} members`;
    };

    // ── Search handler ────────────────────────────────────────────────────────
    const handleSearch = useCallback(async (q: string) => {
        if (!activeChannelId || q.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearchLoading(true);
        try {
            const res = await fetch(
                `/api/messages/search?q=${encodeURIComponent(q)}&channelId=${activeChannelId}`,
                { credentials: "include" }
            );
            if (res.ok) {
                const data = await res.json();
                setSearchResults(Array.isArray(data) ? data : []);
            }
        } catch {
            /* swallow */
        } finally {
            setIsSearchLoading(false);
        }
    }, [activeChannelId]);

    useEffect(() => {
        const t = setTimeout(() => handleSearch(searchQuery), 400);
        return () => clearTimeout(t);
    }, [searchQuery, handleSearch]);

    useEffect(() => {
        if (isSearching) setTimeout(() => searchRef.current?.focus(), 50);
    }, [isSearching]);

    return (
        <div className="flex h-[calc(100vh-0px)] bg-background overflow-hidden">
            {/* Incoming Call Overlay */}
            {webrtc.incomingCall && (
                <CallOverlay
                    call={webrtc.incomingCall}
                    onAccept={() => webrtc.acceptCall()}
                    onReject={() => webrtc.rejectCall()}
                />
            )}

            {/* Active Call Bar (shown when a call is in progress) */}
            {webrtc.callState !== "idle" && !webrtc.incomingCall && (
                <ActiveCallBar
                    callState={webrtc.callState}
                    isMuted={webrtc.isMuted}
                    isCameraOff={webrtc.isCameraOff}
                    onMute={webrtc.toggleMute}
                    onCameraToggle={webrtc.toggleCamera}
                    onHangUp={webrtc.endCall}
                />
            )}

            {/* ── Left Sidebar ──────────────────────────────────────────── */}
            <ChatSidebar
                activeChannelId={activeChannelId}
                onSelectChannel={setActiveChannelId}
                onlineUsers={chatWs.onlineUsers}
                currentUserId={user?.id || ""}
            />

            {/* ── Main Chat Area ───────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
                {activeChannelId ? (
                    <>
                        {/* ── Header ─────────────────────────────────── */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/60 backdrop-blur-sm shrink-0">
                            {isSearching ? (
                                /* Search bar mode */
                                <div className="flex items-center gap-2 flex-1">
                                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <Input
                                        ref={searchRef}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search messages…"
                                        className="h-8 border-0 bg-transparent focus-visible:ring-0 text-sm flex-1"
                                    />
                                    {isSearchLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-8 w-8 shrink-0"
                                        onClick={() => { setIsSearching(false); setSearchQuery(""); setSearchResults([]); }}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                /* Normal header mode */
                                <>
                                    <div className="flex items-center gap-3 min-w-0">
                                        {activeChannel?.type === "direct" && dmPartnerUser ? (
                                            /* DM: show avatar + name + online dot */
                                            <>
                                                <div className="relative shrink-0">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={dmPartnerUser.profileImageUrl || undefined} />
                                                        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                                                            {(dmPartnerUser.firstName?.[0] || "")}
                                                            {(dmPartnerUser.lastName?.[0] || "")}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${isDmOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className="font-semibold text-sm truncate">{dmPartnerName}</h2>
                                                    <p className={`text-xs ${isDmOnline ? "text-green-500" : "text-muted-foreground"}`}>
                                                        {isDmOnline ? "● Online" : "○ Offline"}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            /* Channel / org */
                                            <>
                                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-muted-foreground shrink-0">
                                                    {activeChannel?.type === "org" ? <Users className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className="font-semibold text-sm truncate">{getChannelTitle()}</h2>
                                                    <p className="text-xs text-muted-foreground">{getChannelSubtitle()}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSearching(true)} title="Search messages">
                                            <Search className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAiSummary((s) => !s)} title="AI Summary">
                                            <Sparkles className="w-4 h-4 text-violet-400" />
                                        </Button>
                                        {/* Voice call — DM only passes target, channel call broadcasts */}
                                        <Button
                                            variant="ghost" size="icon" className="h-8 w-8"
                                            onClick={() => webrtc.initiateCall(dmPartnerId || "", activeChannelId || "", "voice")}
                                            title="Voice call"
                                        >
                                            <Phone className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon" className="h-8 w-8"
                                            onClick={() => webrtc.initiateCall(dmPartnerId || "", activeChannelId || "", "video")}
                                            title="Video call"
                                        >
                                            <Video className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Search results banner */}
                        {isSearching && searchResults.length > 0 && (
                            <div className="border-b border-border/50 bg-muted/30 px-4 py-2 max-h-48 overflow-y-auto">
                                <p className="text-xs font-medium text-muted-foreground mb-2">{searchResults.length} result(s)</p>
                                {searchResults.map((msg: any) => (
                                    <div key={msg.id || msg._id} className="py-1.5 border-b border-border/30 last:border-0">
                                        <p className="text-xs text-foreground line-clamp-2">{msg.content}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(msg.createdAt).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {isSearching && searchQuery.length >= 2 && searchResults.length === 0 && !isSearchLoading && (
                            <div className="border-b border-border/50 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                                No messages found for "<span className="font-medium">{searchQuery}</span>"
                            </div>
                        )}

                        {/* AI Summary Panel */}
                        {showAiSummary && (
                            <div className="border-b border-border/50">
                                <AiSummaryCard channelId={activeChannelId} onClose={() => setShowAiSummary(false)} />
                            </div>
                        )}

                        {/* Typing indicator */}
                        {(chatWs.typingUsers[activeChannelId]?.filter((uid) => uid !== user?.id).length ?? 0) > 0 && (
                            <div className="px-4 py-1 text-xs text-muted-foreground animate-pulse shrink-0">
                                {chatWs.typingUsers[activeChannelId]
                                    .filter((uid) => uid !== user?.id)
                                    .map((uid) => {
                                        const m = orgMembers?.find((x: any) => x.userId === uid || x.user?.id === uid);
                                        const u = m?.user ?? m;
                                        return u ? `${u.firstName} ${u.lastName}`.trim() : uid;
                                    })
                                    .join(", ")} {chatWs.typingUsers[activeChannelId].filter(id => id !== user?.id).length === 1 ? "is" : "are"} typing…
                            </div>
                        )}

                        {/* Messages */}
                        <div className="flex-1 overflow-hidden">
                            {messagesLoading ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <MessageList
                                    messages={messages}
                                    currentUserId={user?.id || ""}
                                    onThreadOpen={(msg) => setThreadMessage(msg)}
                                    onReaction={(msgId, emoji) =>
                                        chatWs.addReaction(activeChannelId, msgId, emoji)
                                    }
                                    onSeen={(msgId) => chatWs.sendSeen(activeChannelId, msgId)}
                                    onLoadMore={hasMoreMessages ? handleLoadMore : undefined}
                                />
                            )}
                        </div>

                        {/* Message Input */}
                        <div className="px-4 pb-4 pt-2 shrink-0">
                            <MessageInput
                                channelId={activeChannelId}
                                onSend={(content, opts) =>
                                    chatWs.sendMessage(activeChannelId, content, opts)
                                }
                                onTypingStart={() => chatWs.sendTypingStart(activeChannelId)}
                                onTypingStop={() => chatWs.sendTypingStop(activeChannelId)}
                                channelName={getChannelTitle()}
                            />
                        </div>
                    </>
                ) : (
                    /* Empty state */
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                            <Hash className="w-8 h-8 text-violet-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-semibold text-foreground mb-1">Welcome to Chat</h3>
                            <p className="text-sm">Select a channel or start a direct message</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Thread Panel (right) ─────────────────────────────────── */}
            {threadMessage && (
                <ThreadPanel
                    message={threadMessage}
                    channelId={activeChannelId!}
                    currentUserId={user?.id || ""}
                    onClose={() => setThreadMessage(null)}
                    onSend={(content) =>
                        chatWs.sendMessage(activeChannelId!, content, {
                            parentMessageId: threadMessage.id,
                        })
                    }
                />
            )}
        </div>
    );
}

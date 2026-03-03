/**
 * use-chat-ws.ts — React hook for the realtime chat WebSocket connection.
 *
 * Features:
 * - Fetches a short-lived JWT from /api/chat/ws-token before connecting
 * - Auto-reconnects with exponential backoff (up to 5 retries)
 * - Sends token:refresh when token is 80% expired (Safeguard ②)
 * - Updates TanStack Query cache on incoming events
 * - Tracks online users and typing indicators in state
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ChatWsOptions {
    onMessage?: (event: WsEvent) => void;
}

interface WsEvent {
    type: string;
    payload?: any;
}

interface TypingState {
    [channelId: string]: string[]; // list of userIds currently typing
}

interface OnlineState {
    [userId: string]: boolean;
}

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;

let globalWs: WebSocket | null = null;
let globalToken: string | null = null;
let globalTokenExp: number | null = null;
let retryCount = 0;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(event: WsEvent) => void>();

function notifyListeners(event: WsEvent) {
    listeners.forEach((fn) => fn(event));
}

async function fetchWsToken(): Promise<string> {
    const res = await apiRequest("GET", "/api/chat/ws-token");
    const data = await res.json();
    return data.token;
}

function parseTokenExp(token: string): number {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.exp || 0;
    } catch {
        return 0;
    }
}

async function connectWs(onEvent: (e: WsEvent) => void) {
    if (globalWs && globalWs.readyState === WebSocket.OPEN) return;

    try {
        const token = await fetchWsToken();
        globalToken = token;
        globalTokenExp = parseTokenExp(token);
    } catch (err) {
        console.error("[useChatWs] Failed to fetch WS token:", err);
        return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}?token=${globalToken}`;

    const ws = new WebSocket(wsUrl);
    globalWs = ws;

    ws.onopen = () => {
        console.log("[useChatWs] Connected");
        retryCount = 0;

        // Schedule token refresh at 80% of TTL (Safeguard ②)
        if (globalTokenExp) {
            const now = Math.floor(Date.now() / 1000);
            const ttl = globalTokenExp - now;
            const refreshIn = Math.max(ttl * 0.8, 30) * 1000;
            setTimeout(() => {
                sendRaw({ type: "token:refresh" });
            }, refreshIn);
        }
    };

    ws.onmessage = (raw) => {
        try {
            const event: WsEvent = JSON.parse(raw.data);
            onEvent(event);
            notifyListeners(event);
        } catch {
            // ignore malformed
        }
    };

    ws.onclose = (e) => {
        globalWs = null;
        if (e.code === 4001) {
            // Token expired — reconnect fresh
            globalToken = null;
        }
        scheduleReconnect(onEvent);
    };

    ws.onerror = () => {
        ws.close();
    };
}

function scheduleReconnect(onEvent: (e: WsEvent) => void) {
    if (retryCount >= MAX_RETRIES) {
        console.error("[useChatWs] Max retries reached. Giving up.");
        return;
    }
    const delay = BASE_BACKOFF_MS * Math.pow(2, retryCount);
    retryCount++;
    console.log(`[useChatWs] Reconnecting in ${delay}ms (attempt ${retryCount})`);
    retryTimeout = setTimeout(() => connectWs(onEvent), delay);
}

function sendRaw(event: WsEvent) {
    if (globalWs?.readyState === WebSocket.OPEN) {
        globalWs.send(JSON.stringify(event));
    }
}

/**
 * Main hook — call once in your chat layout; exposes helpers and state.
 */
export function useChatWs(options: ChatWsOptions = {}) {
    const queryClient = useQueryClient();
    const [onlineUsers, setOnlineUsers] = useState<OnlineState>({});
    const [typingUsers, setTypingUsers] = useState<TypingState>({});
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const handleEvent = useCallback((event: WsEvent) => {
        const { type, payload } = event;

        switch (type) {
            case "message:new": {
                const { channelId } = payload;
                // Update cache key WITH null cursor so initial-load useQuery sees it
                queryClient.setQueryData<any>(
                    [`/api/channels/${channelId}/messages`, null],
                    (old: any) => {
                        if (!old) return { messages: [payload], nextCursor: null };
                        // Deduplicate by _id or id
                        const exists = (old.messages || []).some(
                            (m: any) => m.id === payload.id || m._id === payload._id
                        );
                        if (exists) return old;
                        return { ...old, messages: [payload, ...(old.messages || [])] };
                    }
                );
                // Also update cache without cursor for backwards compat
                queryClient.setQueryData<any>(
                    [`/api/channels/${channelId}/messages`],
                    (old: any) => {
                        if (!old) return { messages: [payload], nextCursor: null };
                        const exists = (old.messages || []).some(
                            (m: any) => m.id === payload.id || m._id === payload._id
                        );
                        if (exists) return old;
                        return { ...old, messages: [payload, ...(old.messages || [])] };
                    }
                );
                // Trigger channel list re-sort
                queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
                // Also forward to consumer so they can update local state directly
                optionsRef.current.onMessage?.({ type, payload });
                break;
            }

            case "message:updated": {
                const { messageId, channelId } = payload;
                queryClient.setQueryData<any>(
                    [`/api/channels/${channelId}/messages`],
                    (old: any) => {
                        if (!old?.messages) return old;
                        return {
                            ...old,
                            messages: old.messages.map((m: any) =>
                                m.id === messageId ? { ...m, ...payload } : m
                            ),
                        };
                    }
                );
                break;
            }

            case "typing:update": {
                const { channelId, users } = payload;
                setTypingUsers((prev) => ({ ...prev, [channelId]: users }));
                break;
            }

            case "presence:update": {
                const { userId, status } = payload;
                setOnlineUsers((prev) => ({ ...prev, [userId]: status === "online" }));
                break;
            }

            case "presence:snapshot": {
                // Bulk update: server sends {userId: "online"} map on first connect
                setOnlineUsers((prev) => {
                    const next = { ...prev };
                    Object.entries(payload as Record<string, string>).forEach(([uid, status]) => {
                        next[uid] = status === "online";
                    });
                    return next;
                });
                break;
            }
            case "token:refreshed": {
                globalToken = payload.token;
                globalTokenExp = parseTokenExp(payload.token);
                break;
            }

            case "token:expired": {
                // Reconnect with a fresh token
                connectWs(handleEvent);
                break;
            }

            case "call:incoming":
            case "call:accepted":
            case "call:rejected":
            case "call:ended":
            case "call:offer":
            case "call:answer":
            case "call:ice-candidate":
            case "meeting:started":
            case "meeting:updated":
            case "meeting:ended":
                // Pass through to app-level handler (used by useWebRTC)
                optionsRef.current.onMessage?.(event);
                break;
        }
    }, [queryClient]);

    useEffect(() => {
        connectWs(handleEvent);
        listeners.add(handleEvent);

        return () => {
            listeners.delete(handleEvent);
        };
    }, [handleEvent]);

    // ─── Public API ────────────────────────────────────────────────────────────

    const joinChannel = useCallback((channelId: string) => {
        sendRaw({ type: "join", payload: { channelId } });
    }, []);

    const leaveChannel = useCallback((channelId: string) => {
        sendRaw({ type: "leave", payload: { channelId } });
    }, []);

    const sendMessage = useCallback((channelId: string, content: string, opts?: {
        parentMessageId?: string;
        attachments?: any[];
        voiceNoteUrl?: string;
        linkedTaskId?: string;
    }) => {
        sendRaw({
            type: "message:send",
            payload: { channelId, content, ...opts },
        });
    }, []);

    const sendSeen = useCallback((channelId: string, messageId: string) => {
        sendRaw({ type: "message:seen", payload: { channelId, messageId } });
    }, []);

    const sendTypingStart = useCallback((channelId: string) => {
        sendRaw({ type: "typing:start", payload: { channelId } });
    }, []);

    const sendTypingStop = useCallback((channelId: string) => {
        sendRaw({ type: "typing:stop", payload: { channelId } });
    }, []);

    const addReaction = useCallback((channelId: string, messageId: string, emoji: string) => {
        sendRaw({ type: "reaction:add", payload: { channelId, messageId, emoji } });
    }, []);

    const removeReaction = useCallback((channelId: string, messageId: string, emoji: string) => {
        sendRaw({ type: "reaction:remove", payload: { channelId, messageId, emoji } });
    }, []);

    return {
        sendMessage,
        sendSeen,
        sendTypingStart,
        sendTypingStop,
        addReaction,
        removeReaction,
        joinChannel,
        leaveChannel,
        onlineUsers,
        typingUsers,
        isConnected: globalWs?.readyState === WebSocket.OPEN,
        // Expose raw sender for signaling events (used by useWebRTC)
        _sendRaw: sendRaw,
    };
}

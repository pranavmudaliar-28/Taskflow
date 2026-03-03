import React, { useEffect, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@shared/schema";

interface MessageListProps {
    messages: Message[];
    currentUserId: string;
    onThreadOpen: (msg: Message) => void;
    onReaction: (messageId: string, emoji: string) => void;
    onSeen: (messageId: string) => void;
    onLoadMore?: () => void;
}

function formatDateSeparator(date: Date): string {
    const now = new Date();
    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function MessageList({
    messages, currentUserId, onThreadOpen, onReaction, onSeen, onLoadMore
}: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const topRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    // Infinite load on scroll to top
    useEffect(() => {
        if (!onLoadMore || !topRef.current) return;
        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) onLoadMore();
            },
            { threshold: 0.1 }
        );
        observerRef.current.observe(topRef.current);
        return () => observerRef.current?.disconnect();
    }, [onLoadMore]);

    // Group messages: add date separators and group sequential messages from same sender
    const grouped: Array<{ type: "date"; label: string } | { type: "message"; msg: Message; isGrouped: boolean }> = [];

    let lastDate: string | null = null;
    let lastSenderId: string | null = null;
    let lastTimestamp: number | null = null;

    messages.forEach((msg) => {
        const date = msg.createdAt ? new Date(msg.createdAt) : new Date();
        const dateKey = date.toDateString();

        if (dateKey !== lastDate) {
            grouped.push({ type: "date", label: formatDateSeparator(date) });
            lastDate = dateKey;
            lastSenderId = null;
            lastTimestamp = null;
        }

        // Group if same sender within 5 minutes
        const isGrouped =
            msg.senderId === lastSenderId &&
            lastTimestamp != null &&
            date.getTime() - lastTimestamp < 5 * 60 * 1000 &&
            !msg.parentMessageId;

        grouped.push({ type: "message", msg, isGrouped });

        lastSenderId = msg.senderId;
        lastTimestamp = date.getTime();
    });

    return (
        <div className="h-full overflow-y-auto flex flex-col px-4 py-2 space-y-0.5" style={{ scrollBehavior: "smooth" }}>
            {/* Load more trigger */}
            <div ref={topRef} className="h-1" />

            {onLoadMore && (
                <div className="flex justify-center py-2">
                    <Button variant="ghost" size="sm" onClick={onLoadMore} className="text-xs text-muted-foreground">
                        Load earlier messages
                    </Button>
                </div>
            )}

            {grouped.length === 0 && (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No messages yet. Be the first to say something!
                </div>
            )}

            {grouped.map((item, i) => {
                if (item.type === "date") {
                    return (
                        <div key={`date-${i}`} className="flex items-center gap-3 py-3">
                            <div className="flex-1 h-px bg-border/50" />
                            <span className="text-xs text-muted-foreground font-medium shrink-0">
                                {item.label}
                            </span>
                            <div className="flex-1 h-px bg-border/50" />
                        </div>
                    );
                }

                return (
                    <MessageBubble
                        key={item.msg.id}
                        message={item.msg}
                        isOwn={item.msg.senderId === currentUserId}
                        isGrouped={item.isGrouped}
                        onThreadOpen={() => onThreadOpen(item.msg)}
                        onReaction={(emoji: string) => onReaction(item.msg.id, emoji)}
                        onVisible={() => {
                            if (!item.msg.seenBy?.includes(currentUserId)) {
                                onSeen(item.msg.id);
                            }
                        }}
                    />
                );
            })}

            <div ref={bottomRef} className="h-1" />
        </div>
    );
}

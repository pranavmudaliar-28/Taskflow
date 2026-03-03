import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    MessageSquare, Smile, MoreHorizontal,
    Paperclip, Check, CheckCheck, Mic
} from "lucide-react";
import type { Message } from "@shared/schema";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "🚀"];

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    isGrouped: boolean;
    onThreadOpen: () => void;
    onReaction: (emoji: string) => void;
    onVisible: () => void;
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatUserName(senderId: string): string {
    return senderId.slice(0, 8);
}

export function MessageBubble({
    message, isOwn, isGrouped, onThreadOpen, onReaction, onVisible
}: MessageBubbleProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [showActions, setShowActions] = useState(false);
    const time = message.createdAt ? formatTime(new Date(message.createdAt)) : "";
    const isDeleted = !!message.deletedAt;

    // Mark as seen when visible
    useEffect(() => {
        const obs = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) onVisible(); },
            { threshold: 0.5 }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);

    const seenCount = (message.seenBy || []).filter(id => id !== message.senderId).length;

    // Render system messages uniquely
    if (message.senderId === "system") {
        return (
            <div ref={ref} className="flex justify-center my-4 w-full">
                <span className="text-xs bg-muted/60 text-muted-foreground px-3 py-1.5 rounded-full text-center max-w-[80%]">
                    {message.content}
                </span>
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className={cn(
                "group flex items-end gap-2 py-0.5 px-1 rounded-xl transition-colors hover:bg-accent/30",
                isOwn ? "flex-row-reverse" : "flex-row",
                isGrouped ? "mt-0" : "mt-3"
            )}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Avatar (only for first in group) */}
            {!isGrouped && !isOwn && (
                <Avatar className="h-7 w-7 shrink-0 mb-1">
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                        {formatUserName(message.senderId).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            )}
            {isGrouped && !isOwn && <div className="w-7 shrink-0" />}

            <div className={cn("max-w-[70%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                {/* Sender name (only first in group, non-own) */}
                {!isGrouped && !isOwn && (
                    <span className="text-[11px] font-semibold text-muted-foreground mb-0.5 px-1">
                        {formatUserName(message.senderId)}
                    </span>
                )}

                {/* Bubble */}
                <div
                    className={cn(
                        "relative rounded-2xl px-3 py-2 text-sm leading-relaxed break-words",
                        isDeleted
                            ? "bg-muted/40 text-muted-foreground italic"
                            : isOwn
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                    )}
                >
                    {isDeleted ? (
                        <span>Message deleted</span>
                    ) : (
                        <>
                            {message.content && <p>{message.content}</p>}

                            {/* Voice note */}
                            {message.voiceNoteUrl && (
                                <div className="flex items-center gap-2 mt-1">
                                    <Mic className="w-4 h-4 shrink-0" />
                                    <audio controls src={message.voiceNoteUrl} className="h-8 max-w-[200px]" />
                                </div>
                            )}

                            {/* Attachments */}
                            {message.attachments?.map((att, i) => (
                                att.mimeType?.startsWith("image/") ? (
                                    <img
                                        key={i}
                                        src={att.url}
                                        alt={att.name}
                                        className="mt-1.5 rounded-lg max-w-[200px] max-h-[150px] object-cover"
                                    />
                                ) : (
                                    <a
                                        key={i}
                                        href={att.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1.5 mt-1.5 text-xs underline"
                                    >
                                        <Paperclip className="w-3 h-3" />
                                        {att.name}
                                    </a>
                                )
                            ))}
                        </>
                    )}

                    {/* Time */}
                    <div className={cn(
                        "flex items-center gap-1 mt-0.5",
                        isOwn ? "justify-end" : "justify-start"
                    )}>
                        <span className="text-[10px] opacity-60">{time}</span>
                        {isOwn && (
                            seenCount > 1
                                ? <CheckCheck className="w-3 h-3 opacity-70" />
                                : <Check className="w-3 h-3 opacity-50" />
                        )}
                    </div>
                </div>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 px-1">
                        {Object.entries(
                            message.reactions.reduce((acc: Record<string, number>, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                            }, {})
                        ).map(([emoji, count]) => (
                            <button
                                key={emoji}
                                onClick={() => onReaction(emoji)}
                                className="flex items-center gap-0.5 text-xs bg-accent/70 hover:bg-accent rounded-full px-1.5 py-0.5 transition-colors border border-border/50"
                            >
                                {emoji} <span className="text-muted-foreground">{count}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Thread preview */}
                {message.parentMessageId && (
                    <button
                        onClick={onThreadOpen}
                        className="text-xs text-primary underline mt-0.5 ml-1"
                    >
                        View thread
                    </button>
                )}
            </div>

            {/* Action buttons (shown on hover) */}
            <div className={cn(
                "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-1",
                isOwn ? "order-first mr-0.5" : "ml-0.5"
            )}>
                {/* Quick reactions */}
                {QUICK_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => onReaction(emoji)}
                        className="text-sm hover:scale-125 transition-transform p-0.5"
                    >
                        {emoji}
                    </button>
                ))}
                <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6"
                    onClick={onThreadOpen}
                    title="Reply in thread"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}

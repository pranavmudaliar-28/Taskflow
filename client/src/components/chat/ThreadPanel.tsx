import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageInput } from "./MessageInput";
import { MessageBubble } from "./MessageBubble";
import { X, MessageSquare } from "lucide-react";
import type { Message } from "@shared/schema";

interface ThreadPanelProps {
    message: Message;
    channelId: string;
    currentUserId: string;
    onClose: () => void;
    onSend: (content: string) => void;
}

export function ThreadPanel({ message, channelId, currentUserId, onClose, onSend }: ThreadPanelProps) {
    const { data: messagesData } = useQuery<{ messages: Message[] }>({
        queryKey: [`/api/channels/${channelId}/messages`],
    });

    const replies = (messagesData?.messages || []).filter(
        (m) => m.parentMessageId === message.id
    );

    return (
        <div className="w-80 shrink-0 flex flex-col border-l border-border/50 bg-card/40 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">Thread</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Parent message */}
            <div className="px-4 py-3 border-b border-border/30 bg-accent/20">
                <p className="text-xs text-muted-foreground mb-1">Original message</p>
                <p className="text-sm">{message.content}</p>
            </div>

            {/* Replies */}
            <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-1">
                    {replies.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                            No replies yet. Start the thread!
                        </p>
                    ) : (
                        replies.map((reply) => (
                            <MessageBubble
                                key={reply.id}
                                message={reply}
                                isOwn={reply.senderId === currentUserId}
                                isGrouped={false}
                                onThreadOpen={() => { }}
                                onReaction={() => { }}
                                onVisible={() => { }}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Reply input */}
            <div className="px-3 pb-3 pt-2 border-t border-border/50">
                <MessageInput
                    channelId={channelId}
                    channelName="thread"
                    onSend={(content) => onSend(content)}
                    onTypingStart={() => { }}
                    onTypingStop={() => { }}
                />
            </div>
        </div>
    );
}

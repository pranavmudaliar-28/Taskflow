import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Paperclip, Mic, MicOff, Send, StopCircle, Smile } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MessageInputProps {
    channelId: string;
    channelName: string;
    onSend: (content: string, opts?: {
        attachments?: any[];
        voiceNoteUrl?: string;
    }) => void;
    onTypingStart: () => void;
    onTypingStop: () => void;
}

export function MessageInput({
    channelId, channelName, onSend, onTypingStart, onTypingStop
}: MessageInputProps) {
    const [content, setContent] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [micError, setMicError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);

        // Typing indicator logic
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            onTypingStart();
        }
        clearTimeout(typingTimerRef.current!);
        typingTimerRef.current = setTimeout(() => {
            isTypingRef.current = false;
            onTypingStop();
        }, 2000);
    };

    const handleSend = () => {
        const trimmed = content.trim();
        if (!trimmed) return;
        onSend(trimmed);
        setContent("");
        isTypingRef.current = false;
        onTypingStop();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/chat/upload", {
                method: "POST",
                body: form,
                credentials: "include",
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Upload failed");
                return;
            }
            const data = await res.json();
            onSend("", { attachments: [data] });
        } finally {
            setIsUploading(false);
            e.target.value = "";
        }
    };

    const startRecording = async () => {
        setMicError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Pick best supported mime type
            const mimeType = [
                "audio/webm;codecs=opus",
                "audio/webm",
                "audio/ogg;codecs=opus",
                "audio/ogg",
                "",
            ].find((m) => !m || MediaRecorder.isTypeSupported(m)) ?? "";

            const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = mr;
            audioChunksRef.current = [];

            mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mr.start(100);
            setIsRecording(true);
            setRecordingTime(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime((t) => t + 1);
            }, 1000);
        } catch (err: any) {
            const msg = err?.name === "NotAllowedError"
                ? "Microphone permission denied. Allow mic access in browser settings."
                : "Could not access microphone.";
            setMicError(msg);
        }
    };

    const stopRecording = async () => {
        const mr = mediaRecorderRef.current;
        if (!mr) return;

        clearInterval(recordingTimerRef.current!);
        setIsRecording(false);
        setRecordingTime(0);

        mr.stop();
        mr.stream.getTracks().forEach((t) => t.stop());

        mr.onstop = async () => {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            if (blob.size > 2 * 1024 * 1024) {
                alert("Voice note too large. Max 2MB.");
                return;
            }
            setIsUploading(true);
            try {
                const form = new FormData();
                form.append("file", blob, "voice-note.webm");
                const res = await fetch("/api/chat/upload/voice", {
                    method: "POST",
                    body: form,
                    credentials: "include",
                });
                const data = await res.json();
                if (res.ok) {
                    onSend("", { voiceNoteUrl: data.url });
                } else {
                    alert(data.error || "Voice upload failed");
                }
            } finally {
                setIsUploading(false);
            }
        };
    };

    const formatRecordTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    return (
        <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm ring-1 ring-transparent focus-within:ring-primary/30 transition-all">
            {micError && (
                <div className="flex items-center gap-1.5 px-4 pt-3 text-xs text-amber-600">
                    <span>⚠️ {micError}</span>
                    <button onClick={() => setMicError(null)} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
                </div>
            )}
            {isRecording && (
                <div className="flex items-center gap-2 px-4 pt-3 text-sm text-rose-500">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Recording... {formatRecordTime(recordingTime)}
                </div>
            )}

            <Textarea
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${channelName}`}
                className="resize-none border-0 bg-transparent focus-visible:ring-0 min-h-[44px] max-h-40 px-4 py-3 text-sm"
                rows={1}
                disabled={isRecording}
            />

            <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-1">
                    {/* File attachment */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="image/*,application/pdf,.doc,.docx,.txt,.csv"
                    />
                    <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title="Attach file (max 10MB)"
                    >
                        <Paperclip className="w-4 h-4" />
                    </Button>

                    {/* Voice note */}
                    <Button
                        variant="ghost" size="icon"
                        className={cn(
                            "h-7 w-7",
                            isRecording
                                ? "text-rose-500 hover:text-rose-600"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isUploading}
                        title={isRecording ? "Stop recording" : "Record voice note (max 2MB)"}
                    >
                        {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                </div>

                <Button
                    size="sm"
                    className="h-7 px-3 text-xs rounded-lg"
                    onClick={handleSend}
                    disabled={!content.trim() || isUploading || isRecording}
                >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Send
                </Button>
            </div>
        </div>
    );
}

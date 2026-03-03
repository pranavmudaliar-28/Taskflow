import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useChatWs } from "@/hooks/use-chat-ws";
import { useWebRTC } from "@/hooks/use-webrtc";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AiSummaryCard } from "@/components/chat/AiSummaryCard";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import {
    Mic, MicOff, Video, VideoOff, Monitor, PhoneOff,
    Users, Sparkles, ChevronLeft, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MeetingRoom() {
    const { meetingId } = useParams<{ meetingId: string }>();
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);

    const chatWs = useChatWs({
        onMessage: (event) => webrtc.handleSignalingEvent(event),
    });

    const webrtc = useWebRTC({
        sendSignal: (e) => chatWs._sendRaw(e),
        currentUserId: user?.id || "",
    });

    const { data: meeting, isLoading } = useQuery<any>({
        queryKey: [`/api/meetings/${meetingId}`],
        enabled: !!meetingId,
    });

    const endMeetingMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/meetings/${meetingId}/end`);
            return res.json();
        },
        onSuccess: () => {
            toast({ variant: "success", title: "Meeting ended" });
            setLocation("/chat");
        },
        onError: (err: any) => {
            toast({ variant: "destructive", description: err.message || "Failed to end meeting" });
        },
    });

    // Attach local video stream
    useEffect(() => {
        if (localVideoRef.current && webrtc.localStream) {
            localVideoRef.current.srcObject = webrtc.localStream;
        }
    }, [webrtc.localStream]);

    // Attach remote video stream
    useEffect(() => {
        if (remoteVideoRef.current && webrtc.remoteStream) {
            remoteVideoRef.current.srcObject = webrtc.remoteStream;
        }
    }, [webrtc.remoteStream]);

    // Auto-join meeting via WS
    useEffect(() => {
        if (meetingId) {
            chatWs._sendRaw({ type: "meeting:join", payload: { meetingId } });
        }
        return () => {
            if (meetingId) {
                chatWs._sendRaw({ type: "meeting:leave", payload: { meetingId } });
            }
        };
    }, [meetingId]);

    const handleLeave = () => {
        webrtc.endCall();
        chatWs._sendRaw({ type: "meeting:leave", payload: { meetingId } });
        setLocation("/chat");
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur-sm border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost" size="icon"
                        className="text-slate-400 hover:text-white h-8 w-8"
                        onClick={() => setLocation("/chat")}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="font-bold text-sm">{meeting?.title || "Meeting"}</h2>
                        <p className="text-xs text-slate-400">
                            {meeting?.participants?.length || 1} participant{(meeting?.participants?.length || 1) !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-xs border",
                            webrtc.callState === "connected"
                                ? "border-emerald-500/50 text-emerald-400"
                                : "border-yellow-500/50 text-yellow-400"
                        )}
                    >
                        {webrtc.callState === "connected" ? "● Live" : "● Connecting"}
                    </Badge>
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 flex gap-2 p-4 overflow-hidden">
                {/* Remote Video (main) */}
                <div className="flex-1 relative rounded-2xl bg-slate-900 overflow-hidden">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    {!webrtc.remoteStream && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                                <Users className="w-10 h-10" />
                            </div>
                            <p className="text-sm">Waiting for others to join...</p>
                        </div>
                    )}

                    {/* Local video (mini, PiP) */}
                    <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden bg-slate-800 border border-white/10 shadow-xl">
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        {webrtc.isCameraOff && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                <VideoOff className="w-6 h-6 text-slate-500" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Side panels */}
                {(showParticipants || showAiPanel) && (
                    <div className="w-72 flex flex-col gap-3">
                        {showParticipants && meeting && (
                            <div className="rounded-2xl bg-slate-900 border border-white/5 p-4">
                                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Participants
                                </h3>
                                <div className="space-y-2">
                                    {(meeting.participants || []).map((uid: string) => (
                                        <div key={uid} className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7">
                                                <AvatarFallback className="text-[10px] bg-violet-500/50">
                                                    {uid.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm text-slate-300">{uid.slice(0, 12)}...</span>
                                            {uid === meeting.createdBy && (
                                                <Badge variant="outline" className="ml-auto text-[9px] border-violet-500/30 text-violet-400">Host</Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {showAiPanel && meeting?.channelId && (
                            <div className="rounded-2xl bg-slate-900 border border-white/5 overflow-hidden">
                                <AiSummaryCard
                                    channelId={meeting.channelId}
                                    onClose={() => setShowAiPanel(false)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="px-6 py-4 bg-slate-900/80 backdrop-blur-sm border-t border-white/5">
                <div className="flex items-center justify-center gap-3">
                    <ControlBtn
                        onClick={webrtc.toggleMute}
                        icon={webrtc.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        label={webrtc.isMuted ? "Unmute" : "Mute"}
                        active={webrtc.isMuted}
                    />
                    <ControlBtn
                        onClick={webrtc.toggleCamera}
                        icon={webrtc.isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        label={webrtc.isCameraOff ? "Start Video" : "Stop Video"}
                        active={webrtc.isCameraOff}
                    />
                    <ControlBtn
                        onClick={webrtc.startScreenShare}
                        icon={<Monitor className="w-5 h-5" />}
                        label={webrtc.isScreenSharing ? "Stop Share" : "Share Screen"}
                        active={webrtc.isScreenSharing}
                    />
                    <ControlBtn
                        onClick={() => setShowParticipants((s) => !s)}
                        icon={<Users className="w-5 h-5" />}
                        label="Participants"
                        active={showParticipants}
                    />
                    <ControlBtn
                        onClick={() => setShowAiPanel((s) => !s)}
                        icon={<Sparkles className="w-5 h-5" />}
                        label="AI Summary"
                        active={showAiPanel}
                        className="text-violet-400 hover:text-violet-300"
                    />

                    {/* Leave / End */}
                    <div className="flex items-center gap-2 ml-4">
                        <Button
                            onClick={handleLeave}
                            className="h-12 px-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
                        >
                            <PhoneOff className="w-5 h-5 mr-2" />
                            Leave
                        </Button>
                        {(user?.role === "admin" || user?.role === "owner" || meeting?.createdBy === user?.id) && (
                            <Button
                                onClick={() => endMeetingMutation.mutate()}
                                className="h-12 px-5 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white"
                                disabled={endMeetingMutation.isPending}
                            >
                                End for All
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ControlBtn({
    icon, label, onClick, active, className = ""
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all",
                active
                    ? "bg-white/15 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5",
                className
            )}
        >
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );
}

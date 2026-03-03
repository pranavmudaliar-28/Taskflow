import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from "lucide-react";
import type { CallState } from "@/hooks/use-webrtc";

interface ActiveCallBarProps {
    callState: CallState;
    isMuted: boolean;
    isCameraOff: boolean;
    onMute: () => void;
    onCameraToggle: () => void;
    onHangUp: () => void;
}

function useCallTimer(active: boolean) {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        if (!active) { setSeconds(0); return; }
        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [active]);
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

const STATE_LABELS: Record<CallState, string> = {
    idle: "",
    calling: "Calling…",
    incoming: "Incoming…",
    connecting: "Connecting…",
    connected: "Connected",
    ended: "Call ended",
};

export function ActiveCallBar({
    callState, isMuted, isCameraOff, onMute, onCameraToggle, onHangUp,
}: ActiveCallBarProps) {
    const timer = useCallTimer(callState === "connected");

    return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 mb-6 pointer-events-none">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-md pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
                {/* Status dot + label */}
                <div className="flex items-center gap-2 min-w-[110px]">
                    <span className={`w-2 h-2 rounded-full ${callState === "connected" ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
                    <span className="text-white text-sm font-medium">{STATE_LABELS[callState]}</span>
                    {callState === "connected" && (
                        <span className="text-slate-400 text-xs tabular-nums">{timer}</span>
                    )}
                </div>

                <div className="w-px h-5 bg-white/10" />

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onMute}
                        className={`h-9 w-9 rounded-full ${isMuted ? "bg-rose-500/20 text-rose-400" : "text-slate-300 hover:text-white hover:bg-white/10"}`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>

                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onCameraToggle}
                        className={`h-9 w-9 rounded-full ${isCameraOff ? "bg-rose-500/20 text-rose-400" : "text-slate-300 hover:text-white hover:bg-white/10"}`}
                        title={isCameraOff ? "Turn camera on" : "Turn camera off"}
                    >
                        {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </Button>

                    <Button
                        size="icon"
                        onClick={onHangUp}
                        className="h-9 w-9 rounded-full bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30"
                        title="End call"
                    >
                        <PhoneOff className="w-4 h-4 text-white" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

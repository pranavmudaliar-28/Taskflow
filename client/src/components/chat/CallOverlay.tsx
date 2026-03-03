import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, Mic } from "lucide-react";
import type { IncomingCall } from "@/hooks/use-webrtc";

interface CallOverlayProps {
    call: IncomingCall;
    onAccept: () => void;
    onReject: () => void;
}

export function CallOverlay({ call, onAccept, onReject }: CallOverlayProps) {
    // Play ringing sound
    useEffect(() => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const audioCtx = new AudioContext();
        let isPlaying = true;

        const playRing = async () => {
            while (isPlaying) {
                if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                }
                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                // NA standard ring: 440Hz + 480Hz
                osc1.type = "sine";
                osc2.type = "sine";
                osc1.frequency.value = 440;
                osc2.frequency.value = 480;

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(audioCtx.destination);

                const now = audioCtx.currentTime;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
                gain.gain.setValueAtTime(0.3, now + 2.0);
                gain.gain.linearRampToValueAtTime(0, now + 2.1);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 2.1);
                osc2.stop(now + 2.1);

                // 2 seconds on, 4 seconds off ringing cycle
                await new Promise(r => setTimeout(r, 4000));
            }
        };

        playRing().catch(() => { }); // Catch autoplay rejections gracefully

        return () => {
            isPlaying = false;
            audioCtx.close().catch(() => { });
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />

            {/* Card */}
            <div className="relative z-10 w-80 rounded-3xl bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-white/10 shadow-2xl p-6 pointer-events-auto animate-in slide-in-from-bottom-8 duration-300">
                {/* Pulsing ring */}
                <div className="flex justify-center mb-5">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping scale-125" />
                        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping scale-150 animation-delay-300" />
                        <Avatar className="h-16 w-16 relative border-2 border-primary/50">
                            <AvatarFallback className="text-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                                {call.from.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>

                <div className="text-center mb-6">
                    <p className="text-white font-bold text-lg">{call.from}</p>
                    <p className="text-slate-400 text-sm mt-0.5">
                        Incoming {call.type === "video" ? "📹 video" : "📞 voice"} call
                    </p>
                </div>

                <div className="flex justify-center gap-6">
                    {/* Reject */}
                    <div className="flex flex-col items-center gap-1.5">
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-14 w-14 rounded-full bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30"
                            onClick={onReject}
                        >
                            <PhoneOff className="w-6 h-6" />
                        </Button>
                        <span className="text-xs text-slate-400">Decline</span>
                    </div>

                    {/* Accept */}
                    <div className="flex flex-col items-center gap-1.5">
                        <Button
                            size="icon"
                            className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
                            onClick={onAccept}
                        >
                            {call.type === "video" ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                        </Button>
                        <span className="text-xs text-slate-400">Accept</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

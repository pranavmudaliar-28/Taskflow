/**
 * use-webrtc.ts — React hook for WebRTC peer connections
 *
 * Features:
 * - Fetches ICE config from /api/rtc/ice-config (Safeguard ⑤ — STUN/TURN from server)
 * - Manages RTCPeerConnection lifecycle
 * - Sends signaling messages via the shared WS connection (use-chat-ws)
 * - Supports voice, video, and screen sharing
 * - Incoming call overlay support via global state
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export type CallType = "voice" | "video";

export type CallState =
    | "idle"
    | "calling"
    | "incoming"
    | "connecting"
    | "connected"
    | "ended";

export interface IncomingCall {
    callId: string;
    type: CallType;
    channelId: string;
    from: string;
}

interface WebRTCHookOptions {
    /** Must be the _sendRaw function from useChatWs */
    sendSignal: (event: { type: string; payload?: any }) => void;
    currentUserId: string;
}

async function fetchIceServers(): Promise<RTCIceServer[]> {
    try {
        const res = await apiRequest("GET", "/api/rtc/ice-config");
        const data = await res.json();
        return data.iceServers || [];
    } catch {
        // Fallback to public STUN only
        return [{ urls: "stun:stun.l.google.com:19302" }];
    }
}

export function useWebRTC({ sendSignal, currentUserId }: WebRTCHookOptions) {
    const [callState, setCallState] = useState<CallState>("idle");
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const activeCallIdRef = useRef<string | null>(null);
    const activeCallTypeRef = useRef<CallType>("voice");
    const screenStreamRef = useRef<MediaStream | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);  // stable ref alongside state

    const cleanup = useCallback(() => {
        pcRef.current?.close();
        pcRef.current = null;
        // FIX: always stop local tracks (mic/camera) on cleanup to release hardware
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setCallState("idle");
        setIncomingCall(null);
        setIsMuted(false);
        setIsCameraOff(false);
        setIsScreenSharing(false);
        activeCallIdRef.current = null;
        localStreamRef.current = null;
        screenStreamRef.current = null;
    }, []);

    async function createPeerConnection(callType: CallType): Promise<RTCPeerConnection> {
        const iceServers = await fetchIceServers();
        const pc = new RTCPeerConnection({ iceServers });

        // Handle remote stream
        const remoteMediaStream = new MediaStream();
        setRemoteStream(remoteMediaStream);

        pc.ontrack = (e) => {
            e.streams[0]?.getTracks().forEach((t) => remoteMediaStream.addTrack(t));
        };

        pc.onicecandidate = (e) => {
            if (e.candidate && activeCallIdRef.current) {
                sendSignal({
                    type: "call:ice-candidate",
                    payload: {
                        callId: activeCallIdRef.current,
                        candidate: e.candidate,
                        // targetUserId set by WS server based on active call
                    },
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") setCallState("connected");
            if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
                cleanup();
            }
        };

        return pc;
    }

    async function getLocalMedia(callType: CallType): Promise<MediaStream> {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === "video",
        });
        localStreamRef.current = stream;  // keep stable ref
        setLocalStream(stream);
        return stream;
    }

    // ─── Initiate outbound call ────────────────────────────────────────────────
    const initiateCall = useCallback(async (targetUserId: string, channelId: string, type: CallType) => {
        if (callState !== "idle") return;
        setCallState("calling");
        activeCallTypeRef.current = type;

        try {
            const stream = await getLocalMedia(type);
            const pc = await createPeerConnection(type);
            pcRef.current = pc;
            stream.getTracks().forEach((t) => pc.addTrack(t, stream));

            // Ask WS server to create call and notify target
            sendSignal({
                type: "call:initiate",
                payload: { targetUserId, type, channelId },
            });
        } catch (err) {
            console.error("[useWebRTC] Failed to initiate call:", err);
            cleanup();
        }
    }, [callState, cleanup, sendSignal]);

    // ─── Accept inbound call ───────────────────────────────────────────────────
    const acceptCall = useCallback(async () => {
        if (!incomingCall) return;
        setCallState("connecting");
        activeCallIdRef.current = incomingCall.callId;
        activeCallTypeRef.current = incomingCall.type;

        try {
            const stream = await getLocalMedia(incomingCall.type);
            const pc = await createPeerConnection(incomingCall.type);
            pcRef.current = pc;
            stream.getTracks().forEach((t) => pc.addTrack(t, stream));

            setIncomingCall(null); // Clear overlay
            sendSignal({ type: "call:accept", payload: { callId: incomingCall.callId } });
        } catch (err) {
            console.error("[useWebRTC] Failed to accept call:", err);
            cleanup();
        }
    }, [incomingCall, cleanup, sendSignal]);

    // ─── Reject inbound call ──────────────────────────────────────────────────
    const rejectCall = useCallback(() => {
        if (!incomingCall) return;
        sendSignal({ type: "call:reject", payload: { callId: incomingCall.callId } });
        // FIX: stop any media that may have been acquired
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        setIncomingCall(null);
        setCallState("idle");
    }, [incomingCall, sendSignal]);

    // ─── End active call ──────────────────────────────────────────────────────
    const endCall = useCallback(() => {
        if (activeCallIdRef.current) {
            sendSignal({ type: "call:end", payload: { callId: activeCallIdRef.current } });
        }
        cleanup();
    }, [cleanup, sendSignal]);

    // ─── Media controls ───────────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        localStream?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
        setIsMuted((m) => !m);
    }, [localStream]);

    const toggleCamera = useCallback(() => {
        localStream?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
        setIsCameraOff((c) => !c);
    }, [localStream]);

    const startScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            // Stop screen share, restore camera
            screenStreamRef.current?.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
            setIsScreenSharing(false);
            if (pcRef.current && localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
                if (sender && videoTrack) sender.replaceTrack(videoTrack);
            }
            return;
        }

        try {
            const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
            screenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];

            if (pcRef.current) {
                const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
                if (sender) sender.replaceTrack(screenTrack);
            }

            screenTrack.onended = () => {
                setIsScreenSharing(false);
                screenStreamRef.current = null;
            };

            setIsScreenSharing(true);
        } catch (err) {
            console.error("[useWebRTC] Screen share failed:", err);
        }
    }, [isScreenSharing, localStream]);

    // ─── Handle incoming WS signaling events ─────────────────────────────────
    const handleSignalingEvent = useCallback(async (event: { type: string; payload?: any }) => {
        const { type, payload } = event;
        const pc = pcRef.current;

        switch (type) {
            case "call:initiated":
                // Our own call was created on the server — store callId
                activeCallIdRef.current = payload.callId;
                break;

            case "call:incoming":
                setIncomingCall({
                    callId: payload.callId,
                    type: payload.type,
                    channelId: payload.channelId,
                    from: payload.from,
                });
                setCallState("incoming");
                break;

            case "call:accepted":
                if (!pc) break;
                setCallState("connecting");
                // Create and send offer
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    sendSignal({
                        type: "call:offer",
                        payload: {
                            callId: activeCallIdRef.current,
                            sdp: offer,
                            targetUserId: payload.by,
                        },
                    });
                } catch { }
                break;

            case "call:offer":
                if (!pc) break;
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendSignal({
                        type: "call:answer",
                        payload: {
                            callId: payload.callId,
                            sdp: answer,
                            targetUserId: payload.from,
                        },
                    });
                } catch { }
                break;

            case "call:answer":
                if (!pc) break;
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                } catch { }
                break;

            case "call:ice-candidate":
                if (!pc || !payload.candidate) break;
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch { }
                break;

            case "call:rejected":
                cleanup();
                break;

            case "call:ended":
                cleanup();
                break;
        }
    }, [cleanup, sendSignal]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    return {
        callState,
        incomingCall,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        isScreenSharing,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        startScreenShare,
        handleSignalingEvent, // Pass this to useChatWs's onMessage
    };
}

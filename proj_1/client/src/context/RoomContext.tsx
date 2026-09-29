"use client"

import { createContext, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { peersReducer } from '../reducers/peerReducer';
import { addPeerAction, removePeerAction } from '../reducers/peerActions';
import { IMessage } from '../types/chat';
import { chatReducer } from '../reducers/chatReducer';
import { addHistoryAction, addMessageAction, toggleChatAction } from '../reducers/chatActions';
import { useAuth } from './AuthContext';
import { ws } from '../services/socket';
import { BackgroundPreset, createVirtualBackgroundStream } from '../services/virtualBackground';

// Tạo một Context chung để chia sẻ socket và state cho toàn bộ ứng dụng
export const RoomContext = createContext<null | any>(null);

interface RoomProviderProps {
    children: React.ReactNode;
}

export interface MediaPreferences {
    cameraDeviceId: string;
    microphoneDeviceId: string;
    background: BackgroundPreset;
}

interface AvailableMediaDevices {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
}

const mediaPreferencesKey = "realtime-video-call:media-preferences";
const readMediaPreferences = (): MediaPreferences => {
    try {
        const stored = localStorage.getItem(mediaPreferencesKey);
        if (stored) return { cameraDeviceId: "", microphoneDeviceId: "", background: "none", ...JSON.parse(stored) };
    } catch {
        localStorage.removeItem(mediaPreferencesKey);
    }
    return { cameraDeviceId: "", microphoneDeviceId: "", background: "none" };
};

const getMediaConstraints = (preferences: MediaPreferences): MediaStreamConstraints => ({
    video: preferences.cameraDeviceId ? { deviceId: { exact: preferences.cameraDeviceId } } : true,
    audio: preferences.microphoneDeviceId ? { deviceId: { exact: preferences.microphoneDeviceId } } : true,
});

const createOutboundMedia = async (rawStream: MediaStream, background: BackgroundPreset) => {
    if (background === "none") return { stream: rawStream, dispose: undefined };
    const processed = await createVirtualBackgroundStream(rawStream, background);
    return { stream: processed.stream, dispose: processed.dispose };
};

// Hàm tạo MediaStream giả từ Canvas để test khi không có camera thực tế
const createFakeStream = (): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        // Vẽ nền màu xám và chữ thông báo
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Virtual Test Stream', 200, 240);
    }

    const stream = canvas.captureStream(30);
    const videoTrack = stream.getVideoTracks()[0];
    let frame = 0;

    const drawFrame = () => {
        if (!ctx || videoTrack.readyState === 'ended') return;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Virtual Test Stream', 200, 240);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(20 + (frame % 560), 400, 24, 24);
        frame += 4;
    };

    drawFrame();
    const intervalId = window.setInterval(drawFrame, 1000 / 15);
    videoTrack.addEventListener('ended', () => window.clearInterval(intervalId), { once: true });
    return stream;
};

export const RoomProvider: React.FC<RoomProviderProps> = ({ children }) => {
    const navigate = useNavigate(); // Lấy hàm điều hướng từ React Router
    const { user } = useAuth();

    const [me, setMe] = useState<Peer>(); // Lưu đối tượng PeerJS của chính mình
    const [stream, setStream] = useState<MediaStream>(); // Lưu luồng Media (Camera & Micro hoặc Màn hình) của chính mình
    const [screenStream, setScreenStream] = useState<MediaStream>();
    const [screenStreams, setScreenStreams] = useState<Record<string, MediaStream>>({});
    const [peerReady, setPeerReady] = useState(false);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [mediaPreferences, setMediaPreferences] = useState<MediaPreferences>(readMediaPreferences);
    const [availableMediaDevices, setAvailableMediaDevices] = useState<AvailableMediaDevices>({ cameras: [], microphones: [] });
    const [peers, dispatch] = useReducer(peersReducer, {}); // Quản lý danh sách các peer (người dùng khác) trong phòng
    const [screenSharingId, setScreenSharingId] = useState<string>(""); // Lưu ID của người đang chia sẻ màn hình
    const [roomId, setRoomId] = useState<string>(); // Lưu mã phòng hiện tại
    const [chat, chatDispatch] = useReducer(chatReducer, {
        messages: [],
        isChatOpen: false
    })
    const meRef = useRef<Peer | undefined>(undefined);
    const mediaPreferencesRef = useRef(mediaPreferences);
    const streamRef = useRef<MediaStream | undefined>(undefined);
    const rawStreamRef = useRef<MediaStream | undefined>(undefined);
    const backgroundDisposerRef = useRef<(() => void) | undefined>(undefined);
    const localScreenRef = useRef<MediaStream | undefined>(undefined);
    const roomIdRef = useRef<string | undefined>(undefined);
    const participantIds = useRef(new Set<string>());
    const connectingPeers = useRef(new Set<string>());
    const screenCallsRef = useRef<Record<string, ReturnType<Peer["call"]>>>({});
    const incomingScreenCallsRef = useRef<Record<string, ReturnType<Peer["call"]>>>({});

    const updateRoomId = useCallback((nextRoomId?: string) => {
        roomIdRef.current = nextRoomId;
        setRoomId(nextRoomId);
    }, []);

    // 1. Hàm xử lý khi server báo tạo phòng thành công -> chuyển hướng client sang trang phòng
    const enterRoom = useCallback(({ roomId }: { roomId: string }) => {
        console.log({ roomId });
        navigate(`/room/${roomId}`);
    }, [navigate]);

    const connectToPeer = useCallback((peerId: string) => {
        const localPeer = meRef.current;
        const localStream = streamRef.current;
        if (!localPeer || !localStream || localPeer.id >= peerId || connectingPeers.current.has(peerId)) return;

        connectingPeers.current.add(peerId);
        console.info("PeerJS outgoing call", { from: localPeer.id, to: peerId });
        const call = localPeer.call(peerId, localStream);
        call.on("stream", (peerStream) => {
            console.info("PeerJS remote stream received", { from: peerId, tracks: peerStream.getTracks().length });
            dispatch(addPeerAction(peerId, peerStream));
        });
        call.on("error", (err) => {
            connectingPeers.current.delete(peerId);
            console.error("PeerJS outgoing call failed", { to: peerId, err });
        });
        call.on("close", () => connectingPeers.current.delete(peerId));
    }, [dispatch]);

    const connectScreenToPeer = useCallback((peerId: string) => {
        const localPeer = meRef.current;
        const localScreen = localScreenRef.current;
        if (!localPeer || !localScreen || localPeer.id === peerId || screenCallsRef.current[peerId]) return;

        const call = localPeer.call(peerId, localScreen, { metadata: { kind: "screen" } });
        screenCallsRef.current[peerId] = call;
        call.on("error", (error) => {
            delete screenCallsRef.current[peerId];
            console.error("Screen share call failed:", error);
        });
        call.on("close", () => {
            delete screenCallsRef.current[peerId];
        });
    }, []);

    // 2. Hàm nhận danh sách người dùng hiện có trong phòng từ server
    const getUsers = useCallback(({ participants, sharingPeerId }: { participants: string[]; sharingPeerId?: string }) => {
        console.log("Participants in room:", participants);
        participantIds.current = new Set(participants.filter((peerId) => peerId !== meRef.current?.id));
        participants.forEach((peerId) => {
            connectToPeer(peerId);
            connectScreenToPeer(peerId);
        });
        if (sharingPeerId) setScreenSharingId(sharingPeerId);
    }, [connectScreenToPeer, connectToPeer]);

    // 3. Hàm xóa peer khỏi danh sách Reducer khi họ rời phòng
    const removePeer = useCallback((peerId: string) => {
        participantIds.current.delete(peerId);
        connectingPeers.current.delete(peerId);
        screenCallsRef.current[peerId]?.close();
        delete screenCallsRef.current[peerId];
        incomingScreenCallsRef.current[peerId]?.close();
        delete incomingScreenCallsRef.current[peerId];
        setScreenStreams((current) => {
            const { [peerId]: removed, ...remaining } = current;
            return remaining;
        });
        dispatch(removePeerAction(peerId));
    }, [dispatch]);

    const stopScreenSharing = useCallback(() => {
        const localPeer = meRef.current;
        const activeRoomId = roomIdRef.current;
        localScreenRef.current?.getTracks().forEach((track) => track.stop());
        localScreenRef.current = undefined;
        setScreenStream(undefined);
        Object.values(screenCallsRef.current).forEach((call) => call.close());
        screenCallsRef.current = {};

        if (localPeer && activeRoomId) {
            ws.emit("stop-sharing", { peerId: localPeer.id, roomId: activeRoomId });
        }
        setScreenSharingId((current) => current === localPeer?.id ? "" : current);
    }, []);

    const shareScreen = useCallback(async () => {
        if (localScreenRef.current) {
            stopScreenSharing();
            return;
        }

        try {
            const nextScreen = await navigator.mediaDevices.getDisplayMedia({ video: true });
            localScreenRef.current = nextScreen;
            setScreenStream(nextScreen);
            const localPeer = meRef.current;
            const activeRoomId = roomIdRef.current;
            if (localPeer) setScreenSharingId(localPeer.id);
            if (localPeer && activeRoomId) {
                ws.emit("start-sharing", { peerId: localPeer.id, roomId: activeRoomId });
            }
            participantIds.current.forEach(connectScreenToPeer);
            nextScreen.getVideoTracks()[0]?.addEventListener("ended", stopScreenSharing, { once: true });
        } catch (error) {
            console.error("Could not start screen sharing:", error);
        }
    }, [connectScreenToPeer, stopScreenSharing]);

    const toggleMicrophone = useCallback(() => {
        setIsMicMuted((muted) => {
            const nextMuted = !muted;
            streamRef.current?.getAudioTracks().forEach((track) => {
                track.enabled = !nextMuted;
            });
            return nextMuted;
        });
    }, []);

    const refreshMediaDevices = useCallback(async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAvailableMediaDevices({
            cameras: devices.filter((device) => device.kind === "videoinput"),
            microphones: devices.filter((device) => device.kind === "audioinput"),
        });
    }, []);

    const applyMediaPreferences = useCallback(async (nextPreferences: MediaPreferences) => {
        const nextRawStream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(nextPreferences));
        let nextOutboundStream = nextRawStream;
        let nextDispose: (() => void) | undefined;

        try {
            const processed = await createOutboundMedia(nextRawStream, nextPreferences.background);
            nextOutboundStream = processed.stream;
            nextDispose = processed.dispose;
        } catch (error) {
            nextRawStream.getTracks().forEach((track) => track.stop());
            throw error;
        }
        nextOutboundStream.getAudioTracks().forEach((track) => {
            track.enabled = !isMicMuted;
        });

        const previousRawStream = rawStreamRef.current;
        const previousOutboundStream = streamRef.current;
        const previousDispose = backgroundDisposerRef.current;
        const localPeer = meRef.current;
        const senders = localPeer
            ? Object.values(localPeer.connections).flatMap((connectionGroup: any) =>
                (Array.isArray(connectionGroup) ? connectionGroup : [connectionGroup])
                    .flatMap((connection: any) => connection.peerConnection?.getSenders() || []))
            : [];

        const replacements = (["video", "audio"] as const).map(async (kind) => {
            const nextTrack = nextOutboundStream.getTracks().find((track) => track.kind === kind);
            if (!nextTrack) return;
            await Promise.all(senders.filter((sender: RTCRtpSender) => sender.track?.kind === kind)
                .map((sender: RTCRtpSender) => sender.replaceTrack(nextTrack)));
        });

        try {
            await Promise.all(replacements);
        } catch (error) {
            nextDispose?.();
            nextRawStream.getTracks().forEach((track) => track.stop());
            throw error;
        }

        backgroundDisposerRef.current = nextDispose;
        rawStreamRef.current = nextRawStream;
        streamRef.current = nextOutboundStream;
        setStream(nextOutboundStream);
        setMediaPreferences(nextPreferences);
        mediaPreferencesRef.current = nextPreferences;
        localStorage.setItem(mediaPreferencesKey, JSON.stringify(nextPreferences));

        previousDispose?.();
        if (previousRawStream && previousRawStream !== nextRawStream) {
            previousRawStream.getTracks().forEach((track) => track.stop());
        } else if (previousOutboundStream && previousOutboundStream !== previousRawStream) {
            previousOutboundStream.getTracks().forEach((track) => track.stop());
        }
        await refreshMediaDevices();
    }, [isMicMuted, refreshMediaDevices]);

    const sendMessage = (message: string) => {
        const messageData: IMessage = {
            content: message,
            timestamps: new Date().getTime(),
            author: me?.id,
            authorName: user?.displayName,
        };

        chatDispatch(addMessageAction(messageData));
        ws.emit("send-message", roomId, messageData);
    }

    const addMessage = useCallback((message: IMessage) => {
        console.log('new messages', message);
        chatDispatch(addMessageAction(message));
    }, []);

    const addHistory = useCallback((message: IMessage[]) => {
        chatDispatch(addHistoryAction(message));
    }, []);

    const toggleChat = () => {
        chatDispatch(toggleChatAction(!chat.isChatOpen));
    }

    // 6. Hook chạy một lần duy nhất khi khởi tạo ứng dụng (Mount) để cài đặt PeerJS và Socket Listeners
    useEffect(() => {
        if (!user) {
            ws.disconnect();
            return;
        }

        let active = true;
        ws.connect();
        const meId = uuidv4(); // Tạo định danh ngẫu nhiên cho PeerJS cá nhân
        const peer = new Peer(meId, {
            host: 'localhost',
            port: 9000,
            path: '/'
        });
        peer.on('open', (id) => {
            console.log('PeerJS connected with ID:', id);
            if (active && meRef.current === peer) setPeerReady(true);
        });

        peer.on('call', (call) => {
            if (!active || meRef.current !== peer) return;
            const callKind = (call.metadata as { kind?: string } | undefined)?.kind;
            if (callKind === "screen") {
                incomingScreenCallsRef.current[call.peer] = call;
                call.answer();
                call.on("stream", (remoteScreen) => {
                    setScreenStreams((current) => ({ ...current, [call.peer]: remoteScreen }));
                });
                call.on("close", () => {
                    delete incomingScreenCallsRef.current[call.peer];
                    setScreenStreams((current) => {
                        const { [call.peer]: removed, ...remaining } = current;
                        return remaining;
                    });
                });
                call.on("error", (error) => {
                    console.error("Incoming screen share failed:", error);
                });
                return;
            }

            const localStream = streamRef.current;
            console.info("PeerJS incoming call", { from: call.peer, hasLocalStream: Boolean(localStream) });
            if (!localStream) return;

            call.answer(localStream);
            call.on("stream", (peerStream) => {
                console.info("PeerJS remote stream received", { from: call.peer, tracks: peerStream.getTracks().length });
                dispatch(addPeerAction(call.peer, peerStream));
            });
            call.on("error", (err) => {
                console.error("Peer call error:", err);
            });
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err); // <--- Xem tab console có báo lỗi này không
        });

        meRef.current = peer;
        setMe(peer);

        // Xin quyền truy cập Camera/Micro; nếu không có sẽ tự động fallback sang ảnh/canvas giả lập
        navigator.mediaDevices
            .getUserMedia(getMediaConstraints(mediaPreferencesRef.current))
            .then(async (userStream) => {
                if (!active) {
                    userStream.getTracks().forEach((track) => track.stop());
                    return;
                }
                rawStreamRef.current = userStream;
                try {
                    const outbound = await createOutboundMedia(userStream, mediaPreferencesRef.current.background);
                    if (!active) {
                        outbound.dispose?.();
                        userStream.getTracks().forEach((track) => track.stop());
                        return;
                    }
                    backgroundDisposerRef.current = outbound.dispose;
                    streamRef.current = outbound.stream;
                    setStream(outbound.stream);
                } catch (error) {
                    console.error("Could not initialize selected background; using camera without effects:", error);
                    streamRef.current = userStream;
                    setStream(userStream);
                    setMediaPreferences((current) => ({ ...current, background: "none" }));
                }
                void refreshMediaDevices();
            })
            .catch((error) => {
                if (!active) return;
                console.warn("Không tìm thấy thiết bị thật, đang dùng luồng Canvas giả lập:", error);
                const fakeStream = createFakeStream();
                rawStreamRef.current = fakeStream;
                streamRef.current = fakeStream;
                setStream(fakeStream);
            });

        navigator.mediaDevices.addEventListener("devicechange", refreshMediaDevices);

        // Lắng nghe các sự kiện điều hướng và quản lý phòng từ Socket.IO Server
        ws.on("room-created", enterRoom);
        ws.on("get-users", getUsers);
        ws.on("user-disconnected", removePeer);
        ws.on("user-started-sharing", (peerId) => setScreenSharingId(peerId));
        ws.on("user-stopped-sharing", (peerId: string) => {
            incomingScreenCallsRef.current[peerId]?.close();
            delete incomingScreenCallsRef.current[peerId];
            setScreenSharingId((current) => current === peerId ? "" : current);
            setScreenStreams((current) => {
                const { [peerId]: removed, ...remaining } = current;
                return remaining;
            });
        });
        ws.on("add-message", addMessage)
        ws.on("get-message", addHistory)
        ws.on("user-joined", ({ peerId }: { peerId: string }) => {
            participantIds.current.add(peerId);
            connectToPeer(peerId);
            connectScreenToPeer(peerId);
        });

        // Cleanup function: Gỡ bỏ các listener khi component unmount
        return () => {
            active = false;
            if (meRef.current === peer) {
                meRef.current = undefined;
                setPeerReady(false);
            }
            peer.destroy();
            localScreenRef.current?.getTracks().forEach((track) => track.stop());
            backgroundDisposerRef.current?.();
            rawStreamRef.current?.getTracks().forEach((track) => track.stop());
            if (streamRef.current !== rawStreamRef.current) {
                streamRef.current?.getTracks().forEach((track) => track.stop());
            }
            navigator.mediaDevices.removeEventListener("devicechange", refreshMediaDevices);
            ws.off("room-created");
            ws.off("get-users");
            ws.off("user-disconnected");
            ws.off("user-started-sharing");
            ws.off("user-stopped-sharing");
            ws.off("user-joined");
            ws.off("add-message");
            ws.off("get-message");
        }
    }, [addHistory, addMessage, connectScreenToPeer, connectToPeer, enterRoom, getUsers, refreshMediaDevices, removePeer, user]);

    console.log({ peers });

    return (
        <RoomContext.Provider value={{
            ws, me, stream, screenStream, screenStreams, peerReady, peers, shareScreen,
            stopScreenSharing, screenSharingId, setRoomId: updateRoomId, isMicMuted,
            toggleMicrophone, sendMessage, chat, toggleChat, mediaPreferences,
            availableMediaDevices, refreshMediaDevices, applyMediaPreferences
        }}>
            {children}
        </RoomContext.Provider>
    );
};
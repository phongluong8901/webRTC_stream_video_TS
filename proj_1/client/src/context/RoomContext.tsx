"use client"

import socketIOClient from 'socket.io-client';
import { createContext, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { peersReducer } from '../reducers/peerReducer';
import { addPeerAction, removePeerAction } from '../reducers/peerActions';
import { IMessage } from '../types/chat';
import { chatReducer } from '../reducers/chatReducer';
import { addHistoryAction, addMessageAction, toggleChatAction } from '../reducers/chatActions';

const WS = 'http://localhost:8080';

// Tạo một Context chung để chia sẻ socket và state cho toàn bộ ứng dụng
export const RoomContext = createContext<null | any>(null);

// Khởi tạo kết nối Socket.IO Client tới WebSocket Server (Cổng 8080)
const ws = socketIOClient(WS);

interface RoomProviderProps {
    children: React.ReactNode;
}

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

    const [me, setMe] = useState<Peer>(); // Lưu đối tượng PeerJS của chính mình
    const [stream, setStream] = useState<MediaStream>(); // Lưu luồng Media (Camera & Micro hoặc Màn hình) của chính mình
    const [peerReady, setPeerReady] = useState(false);
    const [peers, dispatch] = useReducer(peersReducer, {}); // Quản lý danh sách các peer (người dùng khác) trong phòng
    const [screenSharingId, setScreenSharingId] = useState<string>(""); // Lưu ID của người đang chia sẻ màn hình
    const [roomId, setRoomId] = useState<string>(); // Lưu mã phòng hiện tại
    const [chat, chatDispatch] = useReducer(chatReducer, {
        messages: [],
        isChatOpen: false
    })
    const meRef = useRef<Peer | undefined>(undefined);
    const streamRef = useRef<MediaStream | undefined>(undefined);
    const connectingPeers = useRef(new Set<string>());

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

    // 2. Hàm nhận danh sách người dùng hiện có trong phòng từ server
    const getUsers = useCallback(({ participants }: { participants: string[] }) => {
        console.log("Participants in room:", participants);
        participants.forEach(connectToPeer);
    }, [connectToPeer]);

    // 3. Hàm xóa peer khỏi danh sách Reducer khi họ rời phòng
    const removePeer = (peerId: string) => {
        connectingPeers.current.delete(peerId);
        dispatch(removePeerAction(peerId));
    }

    // 4. Hàm chuyển đổi luồng stream (dùng cho cả khi bật camera lẫn bật chia sẻ màn hình)
    const switchStream = (newStream: MediaStream) => {
        streamRef.current = newStream;
        setStream(newStream);

        if (me) {
            setScreenSharingId(me.id || "");

            // Thay đổi track video gửi đi cho tất cả các kết nối peer hiện tại thông qua WebRTC Sender
            Object.values(me.connections).forEach((connections: any) => {
                const videoTrack = newStream.getTracks()
                    .find(track => track.kind === 'video');

                if (videoTrack && connections[0]?.peerConnection) {
                    connections[0].peerConnection
                        .getSenders()[1] // Sender thứ 2 ứng với video track
                        .replaceTrack(videoTrack)
                        .catch((err: any) => console.log(err));
                }
            });
        }
    }

    // 5. Hàm điều khiển bật/tắt chia sẻ màn hình
    const shareScreen = () => {
        if (!screenSharingId) {
            // Nếu chưa chia sẻ -> xin quyền lấy stream màn hình (getDisplayMedia)
            navigator.mediaDevices
                .getDisplayMedia({ video: true })
                .then(switchStream)
                .catch((err) => console.log("Error sharing screen:", err));
        } else {
            // Nếu đang chia sẻ -> quay trở lại camera cũ của máy (hoặc tạo lại luồng giả nếu không có camera)
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then(switchStream)
                .catch(() => {
                    const fakeStream = createFakeStream();
                    switchStream(fakeStream);
                });
            setScreenSharingId("");
        }
    }

    const sendMessage = (message: string) => {
        const messageData: IMessage = {
            content: message,
            timestamps: new Date().getTime(),
            author: me?.id,
        };

        chatDispatch(addMessageAction(messageData));
        ws.emit("send-message", roomId, messageData);
    }

    const addMessage = (message: IMessage) => {
        console.log('new messages', message);
        chatDispatch(addMessageAction(message));
    }

    const addHistory = (message: IMessage[]) => {
        chatDispatch(addHistoryAction(message));
    }

    const toggleChat = () => {
        chatDispatch(toggleChatAction(!chat.isChatOpen));
    }

    // 6. Hook chạy một lần duy nhất khi khởi tạo ứng dụng (Mount) để cài đặt PeerJS và Socket Listeners
    useEffect(() => {
        let active = true;
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
            .getUserMedia({ video: true, audio: true })
            .then((userStream) => {
                if (!active) {
                    userStream.getTracks().forEach((track) => track.stop());
                    return;
                }
                streamRef.current = userStream;
                setStream(userStream);
            })
            .catch((error) => {
                if (!active) return;
                console.warn("Không tìm thấy thiết bị thật, đang dùng luồng Canvas giả lập:", error);
                const fakeStream = createFakeStream();
                streamRef.current = fakeStream;
                setStream(fakeStream);
            });

        // Lắng nghe các sự kiện điều hướng và quản lý phòng từ Socket.IO Server
        ws.on("room-created", enterRoom);
        ws.on("get-users", getUsers);
        ws.on("user-disconnected", removePeer);
        ws.on("user-started-sharing", (peerId) => setScreenSharingId(peerId));
        ws.on("user-stopped-sharing", () => setScreenSharingId(""));
        ws.on("add-message", addMessage)
        ws.on("get-message", addHistory)
        ws.on("user-joined", ({ peerId }: { peerId: string }) => connectToPeer(peerId));

        // Cleanup function: Gỡ bỏ các listener khi component unmount
        return () => {
            active = false;
            if (meRef.current === peer) {
                meRef.current = undefined;
                setPeerReady(false);
            }
            peer.destroy();
            ws.off("room-created");
            ws.off("get-users");
            ws.off("user-disconnected");
            ws.off("user-started-sharing");
            ws.off("user-stopped-sharing");
            ws.off("user-joined");
            ws.off("add-message");
            ws.off("get-message");
        }
    }, []);

    // 7. Hook tự động phát tín hiệu Socket khi trạng thái `screenSharingId` thay đổi
    useEffect(() => {
        if (screenSharingId) {
            ws.emit("start-sharing", { peerId: screenSharingId, roomId });
        } else {
            ws.emit("stop-sharing", { peerId: me?.id, roomId });
        }
    }, [screenSharingId, roomId, me]);

    console.log({ peers });

    return (
        <RoomContext.Provider value={{
            ws, me, stream, peerReady, peers, shareScreen, screenSharingId, setRoomId,
            sendMessage, chat, toggleChat
        }}>
            {children}
        </RoomContext.Provider>
    );
};
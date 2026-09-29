"use client"

import socketIOClient from 'socket.io-client';
import { createContext, useEffect, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { peersReducer } from './peerReducer';
import { addPeerAction, removePeerAction } from './peerActions';
import { IMessage } from '../types/chat';

const WS = 'http://localhost:8080';

// Tạo một Context chung để chia sẻ socket và state cho toàn bộ ứng dụng
export const RoomContext = createContext<null | any>(null);

// Khởi tạo kết nối Socket.IO Client tới WebSocket Server (Cổng 8080)
const ws = socketIOClient(WS);

interface RoomProviderProps {
    children: React.ReactNode;
}

export const RoomProvider: React.FC<RoomProviderProps> = ({ children }) => {
    const navigate = useNavigate(); // Lấy hàm điều hướng từ React Router

    const [me, setMe] = useState<Peer>(); // Lưu đối tượng PeerJS của chính mình
    const [stream, setStream] = useState<MediaStream>(); // Lưu luồng Media (Camera & Micro hoặc Màn hình) của chính mình
    const [peers, dispatch] = useReducer(peersReducer, {}); // Quản lý danh sách các peer (người dùng khác) trong phòng
    const [screenSharingId, setScreenSharingId] = useState<string>(""); // Lưu ID của người đang chia sẻ màn hình
    const [roomId, setRoomId] = useState<string>(); // Lưu mã phòng hiện tại

    // 1. Hàm xử lý khi server báo tạo phòng thành công -> chuyển hướng client sang trang phòng
    const enterRoom = ({ roomId }: { roomId: string }) => {
        console.log({ roomId });
        navigate(`/room/${roomId}`);
    };

    // 2. Hàm nhận danh sách người dùng hiện có trong phòng từ server
    const getUsers = ({ participants }: { participants: string[] }) => {
        console.log(participants);
    };

    // 3. Hàm xóa peer khỏi danh sách Reducer khi họ rời phòng
    const removePeer = (peerId: string) => {
        dispatch(removePeerAction(peerId));
    }

    // 4. Hàm chuyển đổi luồng stream (dùng cho cả khi bật camera lẫn bật chia sẻ màn hình)
    const switchStream = (newStream: MediaStream) => {
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
            // Nếu đang chia sẻ -> quay trở lại camera cũ của máy (getUserMedia)
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then(switchStream)
                .catch((err) => console.log("Error getting user media:", err));
            setScreenSharingId("");
        }
    }

    const sendMessage = (message: string) => {
        const messageData: IMessage = {
            content: message,
            timestamps: new Date().getTime(),
            author: me?.id,
        };

        ws.emit("send-message", roomId, messageData);


    }

    // 6. Hook chạy một lần duy nhất khi khởi tạo ứng dụng (Mount) để cài đặt PeerJS và Socket Listeners
    useEffect(() => {
        const meId = uuidv4(); // Tạo định danh ngẫu nhiên cho PeerJS cá nhân
        const peer = new Peer(meId, {
            host: 'localhost',
            port: 9000,
            path: '/myapp'
        });
        setMe(peer);

        // Xin quyền truy cập Camera và Micro mặc định khi vào app (Đã thêm catch để chống crash nếu máy không có thiết bị)
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((stream) => {
                setStream(stream);
            })
            .catch((error) => {
                console.warn("Không tìm thấy thiết bị camera/micro hoặc chưa được cấp quyền:", error);
                // Vẫn cho phép ứng dụng tiếp tục chạy bình thường (stream sẽ là undefined và hiển thị trạng thái tắt camera)
            });

        // Lắng nghe các sự kiện điều hướng và quản lý phòng từ Socket.IO Server
        ws.on("room-created", enterRoom);
        ws.on("get-users", getUsers);
        ws.on("user-disconnected", removePeer);
        ws.on("user-started-sharing", (peerId) => setScreenSharingId(peerId));
        ws.on("user-stopped-sharing", () => setScreenSharingId(""));

        // Cleanup function: Gỡ bỏ các listener khi component unmount để tránh bị gọi trùng lặp
        return () => {
            ws.off("room-created");
            ws.off("get-users");
            ws.off("user-disconnected");
            ws.off("user-started-sharing");
            ws.off("user-stopped-sharing");
            ws.off("user-joined");
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

    // 8. Hook xử lý việc gọi điện P2P qua PeerJS (Chạy khi `me` và `stream` đã sẵn sàng)
    useEffect(() => {
        if (!me) return;
        if (!stream) return;

        // Tình huống A: Khi có người dùng mới tham gia vào phòng (Server phát sự kiện "user-joined")
        ws.on("user-joined", ({ peerId }) => {
            const call = me.call(peerId, stream);

            call.on("stream", (peerStream) => {
                dispatch(addPeerAction(peerId, peerStream));
            });
        });

        // Tình huống B: Khi có người khác gọi điện đến mình
        me.on('call', (call) => {
            call.answer(stream);

            call.on("stream", (peerStream) => {
                dispatch(addPeerAction(call.peer, peerStream));
            });
        });
    }, [me, stream]);

    console.log({ peers });

    return (
        <RoomContext.Provider value={{
            ws, me, stream, peers, shareScreen, screenSharingId, setRoomId,
            sendMessage
        }}>
            {children}
        </RoomContext.Provider>
    );
};
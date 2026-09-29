"use client"

import socketIOClient from 'socket.io-client';
import { createContext, useEffect, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { peersReducer } from './peerReducer';
import { addPeerAction, removePeerAction } from './peerActions';

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
    const [stream, setStream] = useState<MediaStream>(); // Lưu luồng Media (Camera & Micro) của chính mình
    const [peers, dispatch] = useReducer(peersReducer, {}); // Quản lý danh sách các peer (người dùng khác) trong phòng bằng Reducer

    // Hàm xử lý khi server báo tạo phòng thành công -> chuyển hướng client sang trang phòng
    const enterRoom = ({ roomId }: { roomId: string }) => {
        console.log({ roomId });
        navigate(`/room/${roomId}`);
    };

    // Hàm nhận danh sách người dùng hiện có trong phòng từ server
    const getUsers = ({ participants }: { participants: string[] }) => {
        console.log(participants);
    };

    // Hàm xóa peer khỏi danh sách khi họ rời phòng
    const removePeer = (peerId: string) => {
        dispatch(removePeerAction(peerId));
    }

    // 1. Hook chạy một lần duy nhất khi khởi tạo ứng dụng (Mount)
    useEffect(() => {
        const meId = uuidv4(); // Tạo định danh ngẫu nhiên cho PeerJS cá nhân

        // Khởi tạo PeerJS client với ID vừa tạo
        const peer = new Peer(meId);
        setMe(peer);

        // Xin quyền truy cập Camera và Micro từ trình duyệt của người dùng
        try {
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    setStream(stream);
                })
        } catch (error) {
            console.log(error);
        }

        // Lắng nghe các sự kiện từ Socket.IO Server
        ws.on("room-created", enterRoom);        // Khi tạo phòng thành công -> chuyển trang
        ws.on("get-users", getUsers);            // Nhận danh sách thành viên
        ws.on("user-disconnected", removePeer);  // Khi có người ngắt kết nối -> xóa khỏi UI
    }, [])

    // 2. Hook xử lý việc gọi điện P2P qua PeerJS (Chạy khi đã có thông tin `me` và `stream` của mình)
    useEffect(() => {
        if (!me) return;
        if (!stream) return;

        // Tình huống A: Khi có người dùng mới tham gia vào phòng (Server phát sự kiện "user-joined")
        ws.on("user-joined", ({ peerId }) => {
            // Gọi điện đến peer mới vừa vào, đồng thời gửi kèm stream của mình
            const call = me.call(peerId, stream);

            // Lắng nghe sự kiện khi peer kia trả lời và gửi ngược lại stream của họ cho mình
            call.on("stream", (peerStream) => {
                dispatch(addPeerAction(peerId, peerStream));
            });
        });

        // Tình huống B: Khi có người khác gọi đến mình (Mình nhận được cuộc gọi từ PeerJS)
        me.on('call', (call) => {
            // Trả lời cuộc gọi và gửi kèm stream của chính mình cho họ
            call.answer(stream);

            // Lắng nghe luồng stream của người gọi gửi tới để hiển thị lên màn hình
            call.on("stream", (peerStream) => {
                dispatch(addPeerAction(call.peer, peerStream));
            });
        });
    }, [me, stream]);

    console.log({ peers });

    return (
        // Cung cấp các biến trạng thái và kết nối xuống toàn bộ các component con bên trong
        <RoomContext.Provider value={{ ws, me, stream, peers }}>
            {children}
        </RoomContext.Provider>
    );
};
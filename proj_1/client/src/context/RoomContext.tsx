"use client"

import socketIOClient from 'socket.io-client';
import { createContext, useEffect, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { peersReducer } from './peerReducer';
import { addPeerAction, removePeerAction } from './peerActions';

const WS = 'http://localhost:8080';

// Tạo một Context chung để chia sẻ socket cho toàn bộ app
export const RoomContext = createContext<null | any>(null);

// Khởi tạo kết nối Socket.IO với Server (Cổng 8080)
const ws = socketIOClient(WS);

interface RoomProviderProps {
    children: React.ReactNode;
}

export const RoomProvider: React.FC<RoomProviderProps> = ({ children }) => {
    const navigate = useNavigate(); // Lấy hàm chuyển trang từ React Router

    const [me, setMe] = useState<Peer>();

    const [stream, setStream] = useState<MediaStream>();

    const [peers, dispatch] = useReducer(peersReducer, {});

    // Khai báo hàm xử lý khi nhận được mã phòng
    const enterRoom = ({ roomId }: { roomId: string }) => {
        console.log({ roomId });

        navigate(`/room/${roomId}`); // Tự động chuyển hướng trình duyệt sang URL phòng họp
    };

    const getUsers = ({ participants }: { participants: string[] }) => {
        console.log(participants);
    };

    const removePeer = (peerId: string) => {
        dispatch(removePeerAction(peerId));
    }

    // Hook chạy một lần khi component hiển thị lần đầu
    useEffect(() => {
        const meId = uuidv4();

        const peer = new Peer(meId);
        setMe(peer);

        try {
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    setStream(stream);
                })
        } catch (error) {
            console.log(error);

        }

        ws.on("room-created", enterRoom) // Lắng nghe sự kiện "room-created" từ server gửi về
        ws.on("get-users", getUsers);
        ws.on("user-disconnected", removePeer)
    }, [])

    useEffect(() => {
        if (!me) return;
        if (!stream) return;

        ws.on("user-joined", ({ peerId }) => {
            const call = me.call(peerId, stream);

            call.on("stream", (peerStream) => {
                dispatch(addPeerAction(peerId, peerStream))
            });
        });

        me.on('call', (call) => {
            call.answer(stream);

            call.on("stream", (peerStream) => {
                dispatch(addPeerAction(call.peer, peerStream))
            });
        });
    }, [me, stream]);

    console.log({ peers });

    return (
        <RoomContext.Provider value={{ ws, me, stream, peers }}>
            {children}
        </RoomContext.Provider>
    );
};
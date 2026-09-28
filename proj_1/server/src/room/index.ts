import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

export const roomHandler = (socket: Socket) => {
    const createRoom = () => {
        const roomId = uuidv4();
        socket.join(roomId);
        socket.emit("room-created", { roomId });
        console.log(`User created room: ${socket.id}`);
    };
    const joinRoom = ({ roomId }: { roomId: string }) => {
        console.log(`User joined room: ${roomId}`);
    };

    socket.on("create-room", createRoom);
    socket.on("join-room", joinRoom);
};
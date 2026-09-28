import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const rooms: Record<string, string[]> = {}

interface IRoomParams {
    roomId: string;
    peerId: string;
}

export const roomHandler = (socket: Socket) => {
    // 1. Hàm xử lý khi có yêu cầu tạo phòng mới
    const createRoom = () => {
        // Tạo một mã ID ngẫu nhiên, duy nhất (UUID v4)
        const roomId = uuidv4();

        rooms[roomId] = [];

        socket.join(roomId);    // Đưa socket (người dùng) hiện tại vào phòng có mã roomId này
        socket.emit("room-created", { roomId });    // Gửi lại mã roomId về cho client vừa tạo
        console.log(`User created room: ${socket.id}`);
    };

    // 2. Hàm xử lý khi có yêu cầu tham gia phòng đã có sẵn
    const joinRoom = ({ roomId, peerId }: IRoomParams) => {
        if (rooms[roomId]) {
            console.log(`User joined room: ${roomId}`);
            rooms[roomId].push(peerId);
            socket.join(roomId);

            socket.to(roomId).emit("user-joined", { peerId });

            socket.emit('get-users', {
                roomId,
                participants: rooms[roomId]
            });
        }

        socket.on("disconnect", () => {
            console.log("User left the room", peerId);
            leaveRoom({ roomId, peerId });
        });
    };

    const leaveRoom = ({ peerId, roomId }: IRoomParams) => {
        rooms[roomId] = rooms[roomId].filter((id) => id !== peerId);
        socket.to(roomId).emit("user-disconnected", peerId);
    }

    // 3. Đăng ký các sự kiện lắng nghe từ phía Client gửi lên
    socket.on("create-room", createRoom);   // Khi client gọi socket.emit("create-room"), hàm createRoom sẽ chạy
    socket.on("join-room", joinRoom);
};

// .emit = Phát sóng / Gửi thông điệp đi.

// .on = Lắng nghe / Chờ đợi tín hiệu đến.

// .join = Vào một nhóm / Vào phòng chat riêng.
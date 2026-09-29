import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// Lưu trữ danh sách các phòng: key là roomId (string), value là mảng chứa các peerId (string[])
const rooms: Record<string, string[]> = {}

// Định nghĩa kiểu dữ liệu cho tham số đầu vào khi tham gia/rời phòng
interface IRoomParams {
    roomId: string;
    peerId: string;
}

export const roomHandler = (socket: Socket) => {
    // 1. Hàm xử lý khi có yêu cầu tạo phòng mới
    const createRoom = () => {
        const roomId = uuidv4(); // Tạo một mã ID ngẫu nhiên, duy nhất (UUID v4)
        rooms[roomId] = []; // Khởi tạo một mảng rỗng cho phòng mới trong bộ nhớ

        socket.join(roomId); // Đưa socket (người dùng) hiện tại vào phòng có mã roomId này
        socket.emit("room-created", { roomId }); // Gửi lại mã roomId về cho client vừa tạo
        console.log(`User created room: ${socket.id}`);
    };

    // 2. Hàm xử lý khi có yêu cầu tham gia phòng đã có sẵn
    const joinRoom = ({ roomId, peerId }: IRoomParams) => {
        // Kiểm tra xem phòng có tồn tại trong hệ thống hay không
        if (rooms[roomId]) {
            console.log(`User joined room: ${roomId}`);
            rooms[roomId].push(peerId); // Thêm peerId của người dùng mới vào danh sách phòng
            socket.join(roomId); // Cho socket tham gia vào room trên Socket.IO

            // Thông báo cho tất cả người khác trong phòng biết có user mới vừa vào
            socket.to(roomId).emit("user-joined", { peerId });

            // Gửi danh sách toàn bộ thành viên hiện tại trong phòng về cho client vừa tham gia
            socket.emit('get-users', {
                roomId,
                participants: rooms[roomId]
            });
        }

        // Lắng nghe sự kiện khi người dùng ngắt kết nối (đóng tab, mất mạng,...)
        socket.on("disconnect", () => {
            console.log("User left the room", peerId);
            leaveRoom({ roomId, peerId });
        });
    };

    // 3. Hàm xử lý khi người dùng rời phòng
    const leaveRoom = ({ peerId, roomId }: IRoomParams) => {
        // Kiểm tra phòng có tồn tại trước khi lọc để tránh lỗi
        if (rooms[roomId]) {
            // Lọc bỏ peerId của người dùng vừa rời khỏi danh sách phòng
            rooms[roomId] = rooms[roomId].filter((id) => id !== peerId);
            // Thông báo cho những người còn lại trong phòng biết user này đã ngắt kết nối
            socket.to(roomId).emit("user-disconnected", peerId);
        }
    }

    // 4. Đăng ký các sự kiện lắng nghe từ phía Client gửi lên
    socket.on("create-room", createRoom);   // Lắng nghe sự kiện tạo phòng từ client
    socket.on("join-room", joinRoom);       // Lắng nghe sự kiện tham gia phòng từ client
};

// socket.emit(): Phát sóng hoặc gửi một thông điệp riêng đến chính Client đang kết nối.

// socket.on(): Lắng nghe và chờ đợi một sự kiện (tên sự kiện do bạn tự định nghĩa) được gửi đến từ phía Client.

// socket.join(): Đưa một kết nối vào một nhóm (phòng) riêng biệt để dễ dàng gửi tin nhắn chung cho các thành viên trong nhóm đó.

// socket.to(roomId).emit(): Gửi thông điệp đến tất cả các thành viên khác đang ở trong phòng roomId (ngoại trừ người gửi).
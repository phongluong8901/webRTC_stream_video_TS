import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from 'cors';
import { roomHandler } from "./room";

const port = 8080;
const app = express();

// Kích hoạt middleware cors
app.use(cors());

// Tạo một HTTP server thuần túy từ ứng dụng Express
const server = http.createServer(app);

// Khởi tạo Socket.IO server gắn vào HTTP server và cấu hình bảo mật CORS
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Lắng nghe sự kiện khi có một client kết nối thành công tới server
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Truyền đối tượng socket của user này sang file roomHandler để xử lý logic phòng
    roomHandler(socket);

    // Lắng nghe sự kiện khi client ngắt kết nối (tắt tab, mất mạng,...)
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(port, () => {
    console.log(`Listening to the server on port ${port}`);
});
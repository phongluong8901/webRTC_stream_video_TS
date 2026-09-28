import { useContext } from "react"
import { RoomContext } from "../context/RoomContext"

export const Join: React.FC<{}> = () => {
    // Lấy biến kết nối socket (ws) ra từ RoomContext
    const { ws } = useContext(RoomContext);

    // Phát sự kiện "create-room" lên server để yêu cầu tạo phòng mới
    const createRoom = () => {
        ws.emit("create-room"); // Gửi yêu cầu tạo phòng
    }

    return (
        <button
            onClick={createRoom}
            className="bg-rose-400 py-2 px-8 rounded-lg text-xl hover:bg-rose-600 text-white"
        >
            Start new meeting
        </button>
    )
}
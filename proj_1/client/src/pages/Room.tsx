import { useContext, useEffect } from "react";
import { useParams } from "react-router-dom"
import { RoomContext } from "../context/RoomContext";
import { VideoPlayer } from "../components/VideoPlayer";
import { PeerState } from "../context/peerReducer";

export const Room = () => {
    // 1. Lấy ID phòng từ URL (ví dụ: đường dẫn /room/123 -> id = "123")
    const { id } = useParams();

    // 2. Lấy các biến kết nối và state toàn cục từ RoomContext
    // - ws: đối tượng socket để gửi tín hiệu lên server
    // - me: thông tin peerJS của chính mình
    // - stream: luồng media (camera/mic) của chính mình
    // - peers: danh sách các peer khác đang trong phòng
    const { ws, me, stream, peers } = useContext(RoomContext);

    // 3. Tự động phát sự kiện "join-room" lên server khi component được khởi tạo và đã có thông tin `me`
    useEffect(() => {
        if (me) ws.emit("join-room", { roomId: id, peerId: me._id })
    }, [id, me, ws])

    return (
        <>
            {/* Hiển thị mã phòng hiện tại lên giao diện */}
            Room id {id}

            {/* Khung chứa các video dạng lưới 4 cột (sử dụng Tailwind CSS) */}
            <div className="grid grid-cols-4 gap-4">
                {/* 4. Hiển thị video stream của chính mình */}
                <VideoPlayer stream={stream} />

                {/* 5. Lặp qua danh sách các peer khác để render ra các ô video tương ứng */}
                {Object.values(peers as PeerState).map((peer, index) => (
                    <VideoPlayer key={index} stream={peer.stream} />
                ))}
            </div>
        </>
    )
}
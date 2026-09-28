import { useContext, useEffect } from "react";
import { useParams } from "react-router-dom"
import { RoomContext } from "../context/RoomContext";
import { VideoPlayer } from "../components/VideoPlayer";
import { PeerState } from "../context/peerReducer";

export const Room = () => {
    // Lấy ID phòng từ URL (ví dụ: /room/123 -> id = "123")
    const { id } = useParams();
    // Lấy biến kết nối socket (ws) ra từ RoomContext
    const { ws, me, stream, peers } = useContext(RoomContext);

    // Phát sự kiện "join-room" lên server kèm theo dữ liệu mã phòng (roomId)
    useEffect(() => {
        if (me) ws.emit("join-room", { roomId: id, peerId: me._id })
    }, [id, me, ws])

    return (
        <>
            Room id {id}
            <div className="grid grid-cols-4 gap-4">
                <VideoPlayer stream={stream} />
                {Object.values(peers as PeerState).map((peer, index) => (
                    <VideoPlayer key={index} stream={peer.stream} />
                ))}
            </div>
        </>
    )
}
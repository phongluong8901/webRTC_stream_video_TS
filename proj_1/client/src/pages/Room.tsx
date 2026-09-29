import { useContext, useEffect } from "react";
import { useParams } from "react-router-dom"
import { RoomContext } from "../context/RoomContext";
import { VideoPlayer } from "../components/VideoPlayer";
import { PeerState } from "../context/peerReducer";
import { ShareScreenButton } from "../components/ShareScreenButton";
import { ChatButton } from "../components/ChatButton";
import { Chat } from "../components/chat/Chat";

export const Room = () => {
    // 1. Lấy ID phòng từ URL (ví dụ: đường dẫn /room/123 -> id = "123")
    const { id } = useParams();

    // 2. Lấy các biến kết nối và state toàn cục từ RoomContext
    const { ws, me, stream, peers, shareScreen, screenSharingId, setRoomId } = useContext(RoomContext);

    // 3. Tự động phát sự kiện "join-room" lên server khi component khởi tạo và đã có thông tin `me`
    useEffect(() => {
        if (me) ws.emit("join-room", { roomId: id, peerId: me._id })
    }, [id, me, ws]);

    // 4. Cập nhật mã phòng vào Context mỗi khi id thay đổi
    useEffect(() => {
        setRoomId(id);
    }, [id, setRoomId]);

    console.log({ screenSharingId });

    // 5. Xác định luồng video màn hình đang được chia sẻ (của chính mình hoặc của peer khác)
    const screenSharingVideo =
        screenSharingId === me?.id ? stream : peers[screenSharingId]?.stream;

    // 6. Tách người đang chia sẻ ra khỏi danh sách peers thông thường để tránh bị render trùng lặp
    const { [screenSharingId]: sharing, ...peersToShow } = peers;

    return (
        <div className="flex flex-col min-h-screen">
            <div className="bg-red-500 p-4 text-white">
                {/* Hiển thị mã phòng hiện tại lên giao diện */}
                Room id {id}
            </div>

            <div className="flex">
                {/* 7. Nếu có người đang chia sẻ màn hình, hiển thị khung to (chiếm 80% chiều rộng - w-4/5) ở bên trái */}
                {screenSharingId && (
                    <div className="w-4/5">
                        <VideoPlayer stream={screenSharingVideo} />
                    </div>
                )}

                {/* 8. Khung chứa danh sách các video camera còn lại (chiếm 20% dạng 1 cột nếu đang share, hoặc lưới 4 cột nếu không share) */}
                <div className={`grid gap-4 ${screenSharingVideo ? "w-1/5 grid-cols-1" : "grid-cols-4"}`}>
                    {/* Chỉ hiển thị video của chính mình trong lưới nhỏ nếu không phải mình là người đang share */}
                    {screenSharingId !== me?.id && (
                        <VideoPlayer stream={stream} />
                    )}

                    {/* 9. Lặp qua danh sách các peer còn lại để render ra các ô video camera */}
                    {Object.values(peersToShow as PeerState).map((peer, index) => (
                        <VideoPlayer key={index} stream={peer.stream} />
                    ))}
                </div>
                {/* chat  area */}
                <div className="border-l-2 pb-28">
                    <Chat />
                </div>
            </div>

            {/* 10. Thanh công cụ cố định ở đáy màn hình chứa nút bấm Chia sẻ màn hình */}
            <div className="h-28 fixed bottom-0 p-6 w-full flex items-center justify-center border-t-2 bg-white">
                <ShareScreenButton onClick={shareScreen} />
                <ChatButton onClick={shareScreen} />
            </div>
        </div>
    )
}
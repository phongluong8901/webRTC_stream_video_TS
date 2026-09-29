import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import { RoomContext } from "../context/RoomContext";
import { ShareScreenButton } from "../components/ShareScreenButton";
import { ChatButton } from "../components/ChatButton";
import { Chat } from "../components/chat/Chat";
import { MeetingHeader } from "../components/meeting/MeetingHeader";
import { ParticipantGallery } from "../components/meeting/ParticipantGallery";
import { ScreenShareStage } from "../components/meeting/ScreenShareStage";
import { MicrophoneButton } from "../components/meeting/MicrophoneButton";

export const Room = () => {
    // 1. Lấy ID phòng từ URL (ví dụ: đường dẫn /room/123 -> id = "123")
    const { id } = useParams();

    // 2. Lấy các biến kết nối và state toàn cục từ RoomContext
    const {
        ws, me, stream, screenStream, screenStreams, peerReady, peers, shareScreen,
        screenSharingId, setRoomId, toggleChat, chat, isMicMuted, toggleMicrophone
    } = useContext(RoomContext);
    const [linkCopied, setLinkCopied] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const participantCount = 1 + Object.keys(peers).length;
    const activeScreenStream = screenSharingId === me?.id ? screenStream : screenStreams[screenSharingId];
    const sharingLabel = screenSharingId === me?.id ? "bạn" : `thành viên ${screenSharingId?.slice(0, 6)}`;

    useEffect(() => {
        const timerId = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
        return () => window.clearInterval(timerId);
    }, []);

    const duration = [
        Math.floor(elapsedSeconds / 3600),
        Math.floor((elapsedSeconds % 3600) / 60),
        elapsedSeconds % 60,
    ].map((part) => String(part).padStart(2, "0")).join(":");

    const copyRoomLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setLinkCopied(true);
            window.setTimeout(() => setLinkCopied(false), 1800);
        } catch (error) {
            console.error("Could not copy meeting link:", error);
        }
    };

    // 3. Tự động phát sự kiện "join-room" lên server khi component khởi tạo và đã có thông tin `me`
    useEffect(() => {
        if (me && stream && peerReady) ws.emit("join-room", { roomId: id, peerId: me.id })
    }, [id, me, stream, peerReady, ws]);

    // 4. Cập nhật mã phòng vào Context mỗi khi id thay đổi
    useEffect(() => {
        setRoomId(id);
    }, [id, setRoomId]);

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#101719] text-white">
            <MeetingHeader
                roomId={id}
                participantCount={participantCount}
                duration={duration}
                linkCopied={linkCopied}
                onCopyLink={copyRoomLink}
            />

            <main className="relative flex min-h-0 flex-1 gap-3 overflow-hidden p-3 pb-24 sm:gap-4 sm:p-5 sm:pb-24">
                <section aria-label="Danh sách video trong phòng" className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="mb-3 flex flex-none items-center justify-between px-1">
                        <div>
                            <h2 className="text-sm font-semibold text-white/90">Người tham gia</h2>
                            <p className="mt-0.5 text-xs text-white/45">{participantCount} video trong phòng</p>
                        </div>
                        {screenSharingId && <span className="rounded-full bg-[#b8f36b]/10 px-3 py-1.5 text-xs font-medium text-[#c9ff86]">{sharingLabel} đang chia sẻ màn hình</span>}
                    </div>

                    <div className={`flex min-h-0 flex-1 gap-3 ${screenSharingId ? "flex-col sm:flex-row" : ""}`}>
                        {screenSharingId && (
                            <div className="flex min-h-0 min-w-0 flex-1">
                                <ScreenShareStage stream={activeScreenStream} sharerLabel={sharingLabel} />
                            </div>
                        )}
                        <div className={screenSharingId ? "h-[30vh] min-h-28 flex-none sm:h-full sm:w-64 sm:flex-none" : "min-h-0 flex-1"}>
                            <ParticipantGallery
                                localStream={stream}
                                localParticipantId={me?.id ?? "local"}
                                localMicMuted={isMicMuted}
                                peers={peers}
                                compact={Boolean(screenSharingId)}
                            />
                        </div>
                    </div>
                </section>

                {chat.isChatOpen && (
                    <aside className="absolute inset-x-3 bottom-24 top-3 z-20 flex min-h-0 flex-col rounded-xl border border-white/10 bg-[#172124] shadow-2xl sm:relative sm:inset-auto sm:w-80 sm:flex-none">
                        <Chat onClose={toggleChat} />
                    </aside>
                )}
            </main>

            <footer className="fixed inset-x-0 bottom-0 z-30 flex min-h-20 items-center justify-center border-t border-white/10 bg-[#172124]/95 px-3 py-3 backdrop-blur sm:min-h-[88px]">
                <div className="flex items-center gap-2 sm:gap-3">
                    <MicrophoneButton muted={isMicMuted} onClick={toggleMicrophone} />
                    <ShareScreenButton onClick={shareScreen} isSharing={Boolean(screenStream)} />
                    <ChatButton onClick={toggleChat} isOpen={chat.isChatOpen} />
                </div>
            </footer>
        </div>
    )
}
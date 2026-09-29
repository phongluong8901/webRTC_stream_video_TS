import { VideoPlayer } from "../VideoPlayer";
import { ParticipantAvatar } from "./ParticipantAvatar";

interface ParticipantTileProps {
    stream?: MediaStream;
    label: string;
    participantId: string;
    isLocal?: boolean;
    microphoneMuted?: boolean;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
    stream,
    label,
    participantId,
    isLocal = false,
    microphoneMuted = false,
}) => (
    <div className="relative aspect-video min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#202b2e]">
        <VideoPlayer stream={stream} muted={isLocal} />
        {!stream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-white/55">
                <ParticipantAvatar participantId={participantId} size="large" />
                <span>Đang kết nối...</span>
            </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8">
            <div className="flex min-w-0 items-center gap-2">
                <ParticipantAvatar participantId={participantId} />
                <span className="truncate text-xs font-medium text-white">{label}</span>
            </div>
            {microphoneMuted && (
                <span className="flex-none rounded-md bg-black/55 p-1.5 text-white/85" title="Micro đã tắt">
                    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9V6a3 3 0 0 0-5.83-1M5 10v2a7 7 0 0 0 12 4.9M19 10v2a6.97 6.97 0 0 1-.4 2.34M12 19v3m-4 0h8M3 3l18 18" />
                    </svg>
                </span>
            )}
        </div>
    </div>
);
import { VideoPlayer } from "../VideoPlayer";

interface ScreenShareStageProps {
    stream?: MediaStream;
    sharerLabel: string;
}

export const ScreenShareStage: React.FC<ScreenShareStageProps> = ({ stream, sharerLabel }) => (
    <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
        {stream ? (
            <VideoPlayer stream={stream} fit="contain" />
        ) : (
            <div className="flex flex-col items-center gap-3 text-center text-sm text-white/55">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-[#b8f36b]" />
                Đang kết nối màn hình chia sẻ...
            </div>
        )}
        <span className="absolute bottom-3 left-3 rounded-md bg-black/65 px-2.5 py-1.5 text-xs font-medium">
            Màn hình của {sharerLabel}
        </span>
    </div>
);
interface MeetingHeaderProps {
    roomId: string | undefined;
    participantCount: number;
    duration: string;
    linkCopied: boolean;
    onCopyLink: () => void;
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({
    roomId,
    participantCount,
    duration,
    linkCopied,
    onCopyLink,
}) => (
    <header className="z-10 flex flex-none flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#172124] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#b8f36b] text-sm font-bold text-[#172124]">VC</div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-sm font-semibold sm:text-base">Phòng họp</h1>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Đang hoạt động
                    </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-white/55">Mã phòng: {roomId}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-white/75">
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
                </svg>
                {participantCount} người
            </div>
            <div className="hidden min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm tabular-nums text-white/65 md:flex">
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" d="M12 7v5l3 2" />
                </svg>
                {duration}
            </div>
            <button
                type="button"
                onClick={onCopyLink}
                title="Sao chép liên kết phòng"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#b8f36b] px-3 text-sm font-semibold text-[#172124] transition hover:bg-[#c9ff86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8f36b]"
            >
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path strokeLinecap="round" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{linkCopied ? "Đã sao chép" : "Mời tham gia"}</span>
            </button>
        </div>
    </header>
);
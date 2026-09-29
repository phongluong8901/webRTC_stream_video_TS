interface MicrophoneButtonProps {
    muted: boolean;
    onClick: () => void;
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ muted, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={muted}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8f36b] ${muted ? "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30" : "bg-white/10 text-white hover:bg-white/15"}`}
    >
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {muted ? (
                <>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9V6a3 3 0 0 0-5.83-1M5 10v2a7 7 0 0 0 12 4.9M19 10v2a6.97 6.97 0 0 1-.4 2.34M12 19v3m-4 0h8" />
                    <path strokeLinecap="round" d="m3 3 18 18" />
                </>
            ) : (
                <>
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8" />
                </>
            )}
        </svg>
        <span>{muted ? "Bật mic" : "Tắt mic"}</span>
    </button>
);
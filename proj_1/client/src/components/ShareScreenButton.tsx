export const ShareScreenButton: React.FC<{ onClick: () => void; isSharing: boolean }> = ({ onClick, isSharing }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isSharing}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8f36b] ${isSharing ? "bg-[#b8f36b] text-[#172124] hover:bg-[#c9ff86]" : "bg-white/10 text-white hover:bg-white/15"}`}
        >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4m-6-9h12" />
            </svg>
            <span>{isSharing ? "Quay lại camera" : "Chia sẻ màn hình"}</span>
        </button>
    )
}
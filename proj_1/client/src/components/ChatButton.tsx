export const ChatButton: React.FC<{ onClick: () => void; isOpen: boolean }> = ({ onClick, isOpen }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isOpen}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8f36b] ${isOpen ? "bg-white text-[#172124]" : "bg-white/10 text-white hover:bg-white/15"}`}
        >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H13l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z" />
            </svg>
            <span>{isOpen ? "Đóng chat" : "Chat"}</span>
        </button>
    )
}
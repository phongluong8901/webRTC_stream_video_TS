interface ParticipantAvatarProps {
    participantId: string;
    size?: "small" | "large";
}

const avatarThemes = [
    "bg-[#f4b183] text-[#392417]",
    "bg-[#a9d9c5] text-[#17372c]",
    "bg-[#9fc4ef] text-[#172d47]",
    "bg-[#e5b4d2] text-[#43263a]",
    "bg-[#e9d58e] text-[#3c3317]",
    "bg-[#b9b0ed] text-[#292448]",
    "bg-[#a9d8df] text-[#17343a]",
    "bg-[#edaaa5] text-[#482522]",
];

const getAvatarIndex = (participantId: string) => {
    let hash = 0;
    for (const character of participantId) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }
    return hash % avatarThemes.length;
};

export const ParticipantAvatar: React.FC<ParticipantAvatarProps> = ({ participantId, size = "small" }) => {
    const stableId = participantId || "guest";
    const initials = stableId.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?";
    const dimensions = size === "large" ? "h-16 w-16 text-lg" : "h-8 w-8 text-[11px]";

    return (
        <span
            aria-hidden="true"
            title={`Avatar ${stableId}`}
            className={`grid flex-none place-items-center rounded-full font-bold ring-2 ring-black/20 ${dimensions} ${avatarThemes[getAvatarIndex(stableId)]}`}
        >
            {initials}
        </span>
    );
};
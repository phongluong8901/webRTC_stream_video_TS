import { PeerState } from "../../reducers/peerReducer";
import { ParticipantTile } from "./ParticipantTile";

interface ParticipantGalleryProps {
    localStream?: MediaStream;
    localParticipantId: string;
    localMicMuted: boolean;
    peers: PeerState;
    compact?: boolean;
}

export const ParticipantGallery: React.FC<ParticipantGalleryProps> = ({ localStream, localParticipantId, localMicMuted, peers, compact = false }) => {
    const entries = Object.entries(peers);

    return (
        <div className={compact ? "h-full min-h-0 overflow-x-auto overflow-y-hidden sm:overflow-x-hidden sm:overflow-y-auto" : "h-full min-h-0 overflow-y-auto pr-1"}>
            <div
                className={`grid gap-3 ${compact
                    ? "h-full min-w-max grid-flow-col auto-cols-[minmax(180px,1fr)] content-center items-start sm:h-auto sm:min-h-full sm:min-w-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-1 sm:content-start"
                    : "min-h-full auto-rows-max content-start items-start"
                    }`}
                style={compact ? undefined : { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}
            >
                <ParticipantTile stream={localStream} label="Bạn" participantId={localParticipantId} isLocal microphoneMuted={localMicMuted} />
                {entries.map(([peerId, peer], index) => (
                    <div
                        key={peerId}
                        className={!compact && entries.length === 2 && index === 1
                            ? "min-[480px]:col-span-2 min-[480px]:w-1/2 min-[480px]:justify-self-center xl:col-span-1 xl:w-full"
                            : "min-w-0"
                        }
                    >
                        <ParticipantTile stream={peer.stream} label={`Thành viên ${peerId.slice(0, 6)}`} participantId={peerId} />
                    </div>
                ))}
            </div>
        </div>
    );
};
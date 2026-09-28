import { useEffect, useRef } from "react";

interface VideoPlayerProps {
    stream: MediaStream | undefined; // Cho phép nhận undefined
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video ref={videoRef} autoPlay muted={true} />
    );
}
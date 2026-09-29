import { useEffect, useRef } from "react";

// Định nghĩa kiểu dữ liệu cho props đầu vào của component
interface VideoPlayerProps {
    stream: MediaStream | undefined; // Luồng media (camera/mic) truyền vào, có thể là undefined nếu chưa tải xong
    muted?: boolean;
    fit?: "cover" | "contain";
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream, muted = true, fit = "cover" }) => {
    // 1. Khai báo một tham chiếu (ref) trỏ trực tiếp đến thẻ <video> trong DOM
    const videoRef = useRef<HTMLVideoElement>(null);

    // 2. Sử dụng useEffect để cập nhật srcObject mỗi khi luồng stream thay đổi
    useEffect(() => {
        // Kiểm tra xem thẻ <video> đã được mount vào DOM và stream đã có dữ liệu chưa
        if (videoRef.current) {
            videoRef.current.srcObject = stream ?? null;
        }
    }, [stream]);

    return (
        // 3. Trả về thẻ video:
        // - ref={videoRef}: liên kết thẻ này với useRef ở trên
        // - autoPlay: tự động phát video ngay khi có stream
        // - muted={true}: tắt tiếng (khử tiếng vang/feedback) đối với video của chính mình
        <video
            ref={videoRef}
            autoPlay
            muted={muted}
            playsInline
            className={`block h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
        />
    );
}
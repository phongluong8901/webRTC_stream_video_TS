import { useContext } from "react";
import { IMessage } from "../../types/chat";
import { RoomContext } from "../../context/RoomContext";
import classNames from "classnames";

// Component ChatBubble bắt buộc phải nhận một prop tên là message có kiểu là IMessage. Nếu component cha truyền thiếu hoặc truyền sai kiểu dữ liệu, TypeScript sẽ báo lỗi ngay
export const ChatBubble: React.FC<{ message: IMessage }> = ({ message }) => {
    const { me } = useContext(RoomContext);
    const isSelf = message.author === me?.id;
    const sender = isSelf ? "Bạn" : message.authorName || `Thành viên ${message.author?.slice(0, 6) || "khách"}`;
    const sentAt = new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(message.timestamps);

    return (
        <div className={classNames("my-3 flex", {
            "justify-end pl-8": isSelf,
            "justify-start pr-8": !isSelf,
        })}>
            <div className="max-w-full">
                <div className={classNames("mb-1 flex items-center gap-2 text-[11px] text-white/45", {
                    "justify-end": isSelf,
                })}>
                    <span>{sender}</span>
                    <time>{sentAt}</time>
                </div>
                <div className={classNames("break-words rounded-2xl px-3 py-2 text-sm leading-relaxed", {
                    "rounded-br-sm bg-[#b8f36b] text-[#172124]": isSelf,
                    "rounded-bl-sm bg-white/10 text-white/90": !isSelf,
                })}>
                    {message.content}
                </div>
            </div>
        </div>
    );
};
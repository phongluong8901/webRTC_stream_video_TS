import { useContext } from "react";
import { IMessage } from "../../types/chat";
import { RoomContext } from "../../context/RoomContext";
import classNames from "classnames";

// Component ChatBubble bắt buộc phải nhận một prop tên là message có kiểu là IMessage. Nếu component cha truyền thiếu hoặc truyền sai kiểu dữ liệu, TypeScript sẽ báo lỗi ngay
export const ChatBubble: React.FC<{ message: IMessage }> = ({ message }) => {
    const { me } = useContext(RoomContext);
    const isSelf = message.author === me?.id;

    return (
        <div className={classNames("m-2 flex", {
            "pl-10 justify-end": isSelf,
            "pr-10 justify-start": !isSelf,
        })}>
            <div className={classNames("inline-block py-2 px-4 rounded", {
                "bg-red-200": isSelf,
                "bg-blue-200": !isSelf,
            })}>
                {message.content}
            </div>
        </div>
    );
};
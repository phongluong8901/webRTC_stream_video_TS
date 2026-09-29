import { useContext, useEffect, useRef } from "react";
import { IMessage } from "../../types/chat";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { RoomContext } from "../../context/RoomContext";

export const Chat: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { chat } = useContext(RoomContext);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat.messages]);

    return (
        <div className="flex min-h-0 h-full flex-col">
            <header className="flex flex-none items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                    <h2 className="text-sm font-semibold">Tin nhắn trong phòng</h2>
                    <p className="mt-0.5 text-xs text-white/45">Trao đổi với mọi người</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Đóng khung chat"
                    className="grid h-9 w-9 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8f36b]"
                >
                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
                    </svg>
                </button>
            </header>

            <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                {chat.messages.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-white/45">Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.</p>
                ) : chat.messages.map((message: IMessage, index: number) => (
                    <ChatBubble key={`${message.timestamps}-${message.author}-${index}`} message={message} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="flex-none border-t border-white/10 p-3">
                <ChatInput />
            </div>
        </div >
    )
}
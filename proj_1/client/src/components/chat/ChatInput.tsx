import { useContext, useState } from "react";
import { Button } from "../common/Button";
import { RoomContext } from "../../context/RoomContext";

export const ChatInput: React.FC = () => {
    const [message, setMessage] = useState("");
    const { sendMessage } = useContext(RoomContext);

    const submitMessage = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage) return;
        sendMessage(trimmedMessage);
        setMessage("");
    };

    return (
        <div>
            <form onSubmit={submitMessage}>
                <div className="flex items-end gap-2">
                    <textarea
                        aria-label="Nhập tin nhắn"
                        placeholder="Nhập tin nhắn..."
                        rows={2}
                        className="min-h-11 min-w-0 flex-1 resize-none rounded-lg border border-white/10 bg-[#101719] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#b8f36b]/70"
                        onChange={(e) => setMessage(e.target.value)}
                        value={message}
                    />
                    <Button
                        testId="send-msg-button"
                        type="submit"
                        aria-label="Gửi tin nhắn"
                        disabled={!message.trim()}
                        className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-[#b8f36b] text-[#172124] transition hover:bg-[#c9ff86] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <svg
                            style={{ transform: "rotate(90deg)" }}
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                        </svg>
                    </Button>
                </div>
            </form>
        </div>
    )
}
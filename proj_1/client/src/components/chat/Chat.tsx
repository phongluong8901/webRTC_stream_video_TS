import { IMessage } from "../../types/chat";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";

export const Chat: React.FC = ({ }) => {
    const messages: IMessage[] = [
        {
            content: "Message 1",
            author: "",
            timestamps: 0,
        }
    ];

    return (
        <div className="flex flex-col h-full justify-between">
            <div>
                {messages.map((message: IMessage) => (
                    <ChatBubble message={message} />
                ))}
            </div>
            <ChatInput />
        </div>
    )
}
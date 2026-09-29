import { useContext, useEffect, useState } from "react"
import { RoomContext } from "../context/RoomContext"

export const Join: React.FC<{}> = () => {
    const { ws } = useContext(RoomContext);
    const [connected, setConnected] = useState(Boolean(ws.connected));
    const [error, setError] = useState("");

    useEffect(() => {
        const onConnect = () => {
            setConnected(true);
            setError("");
        };
        const onDisconnect = () => setConnected(false);
        const onRoomError = (message: string) => setError(message);
        ws.on("connect", onConnect);
        ws.on("disconnect", onDisconnect);
        ws.on("room-error", onRoomError);
        return () => {
            ws.off("connect", onConnect);
            ws.off("disconnect", onDisconnect);
            ws.off("room-error", onRoomError);
        };
    }, [ws]);

    const createRoom = () => {
        setError("");
        ws.emit("create-room");
    }

    return (
        <div>
            <button
                type="button"
                onClick={createRoom}
                disabled={!connected}
                className="min-h-11 rounded-lg bg-[#b8f36b] px-6 font-semibold text-[#172124] hover:bg-[#c9ff86] disabled:cursor-wait disabled:opacity-50"
            >
                {connected ? "Tạo phòng họp mới" : "Đang kết nối..."}
            </button>
            {error && <p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>}
        </div>
    )
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Join } from "../components/CreateButton"

export const Home = () => {
    const [roomId, setRoomId] = useState("");
    const navigate = useNavigate();

    const joinRoom = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedRoomId = roomId.trim();
        if (trimmedRoomId) navigate(`/room/${encodeURIComponent(trimmedRoomId)}`);
    };

    return (
        <div className="App flex flex-col items-center justify-center w-screen h-screen">
            <Join />
            <form onSubmit={joinRoom} className="mt-6 flex gap-2">
                <input
                    aria-label="Room ID"
                    placeholder="Enter room ID"
                    value={roomId}
                    onChange={(event) => setRoomId(event.target.value)}
                    className="border rounded px-3 py-2"
                />
                <button
                    type="submit"
                    disabled={!roomId.trim()}
                    className="bg-slate-700 py-2 px-5 rounded-lg text-white disabled:opacity-50"
                >
                    Join room
                </button>
            </form>
        </div>
    )
}
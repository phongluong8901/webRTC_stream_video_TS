import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Join } from "../components/CreateButton"
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

interface RoomHistoryItem {
    roomId: string;
    status: "waiting" | "active" | "ended";
    createdAt: string;
    durationMs: number;
    participantCount: number;
}

export const Home = () => {
    const [roomId, setRoomId] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [history, setHistory] = useState<RoomHistoryItem[]>([]);
    const navigate = useNavigate();
    const { user, loading, login, register, googleLogin, logout } = useAuth();

    useEffect(() => {
        if (!user) {
            setHistory([]);
            return;
        }
        apiRequest<{ rooms: RoomHistoryItem[] }>("/api/rooms")
            .then((result) => setHistory(result.rooms))
            .catch((requestError: Error) => setError(requestError.message));
    }, [user?.id]);

    const joinRoom = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedRoomId = roomId.trim();
        if (trimmedRoomId) navigate(`/room/${encodeURIComponent(trimmedRoomId)}`);
    };

    const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        try {
            if (isRegistering) {
                setMessage(await register(email, password, displayName));
            } else {
                await login(email, password);
            }
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Không thể xác thực tài khoản.");
        } finally {
            setBusy(false);
        }
    };

    const handleGoogleLogin = (credential?: string) => {
        if (!credential) {
            setError("Google không trả về thông tin đăng nhập. Hãy thử lại.");
            return;
        }
        setBusy(true);
        setError("");
        void googleLogin(credential)
            .catch((requestError: Error) => setError(requestError.message))
            .finally(() => setBusy(false));
    };

    if (loading) {
        return <main className="grid min-h-screen place-items-center bg-[#101719] text-white">Đang kiểm tra phiên đăng nhập...</main>;
    }

    return (
        <main className="min-h-screen bg-[#101719] px-4 py-10 text-white sm:px-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-8">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#b8f36b] font-bold text-[#172124]">VC</div>
                        <div>
                            <h1 className="text-xl font-semibold">Realtime Video Calling</h1>
                            <p className="mt-1 text-sm text-white/55">Phòng họp video và chia sẻ màn hình</p>
                        </div>
                    </div>
                    {user && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-white/75">{user.displayName} · {user.email}</span>
                            <button type="button" onClick={() => navigate("/profile")} className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10">Hồ sơ & cài đặt</button>
                            <button type="button" onClick={() => void logout()} className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10">Đăng xuất</button>
                        </div>
                    )}
                </header>

                {!user ? (
                    <section className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#172124] p-6 shadow-xl sm:p-8">
                        <h2 className="text-xl font-semibold">{isRegistering ? "Tạo tài khoản" : "Đăng nhập"}</h2>
                        <p className="mt-2 text-sm text-white/55">{isRegistering ? "Xác minh email trước khi bắt đầu họp." : "Đăng nhập để tạo phòng hoặc tham gia cuộc họp."}</p>

                        <form onSubmit={submitAuth} className="mt-6 space-y-4">
                            {isRegistering && (
                                <label className="block text-sm text-white/75">
                                    Tên hiển thị
                                    <input required minLength={2} maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-[#101719] px-3 text-white outline-none focus:border-[#b8f36b]" />
                                </label>
                            )}
                            <label className="block text-sm text-white/75">
                                Email
                                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-[#101719] px-3 text-white outline-none focus:border-[#b8f36b]" />
                            </label>
                            <label className="block text-sm text-white/75">
                                Mật khẩu
                                <input required minLength={isRegistering ? 12 : 1} type="password" autoComplete={isRegistering ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-[#101719] px-3 text-white outline-none focus:border-[#b8f36b]" />
                                {isRegistering && <span className="mt-1 block text-xs text-white/40">Tối thiểu 12 ký tự.</span>}
                            </label>
                            {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
                            {message && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
                            <button disabled={busy} type="submit" className="min-h-11 w-full rounded-lg bg-[#b8f36b] px-4 font-semibold text-[#172124] hover:bg-[#c9ff86] disabled:opacity-50">
                                {busy ? "Đang xử lý..." : isRegistering ? "Đăng ký và gửi email xác minh" : "Đăng nhập bằng email"}
                            </button>
                        </form>

                        <div className="my-5 flex items-center gap-3 text-xs text-white/35"><span className="h-px flex-1 bg-white/10" />HOẶC<span className="h-px flex-1 bg-white/10" /></div>
                        {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
                            <div className="flex justify-center [&>div]:w-full [&_iframe]:max-w-full">
                                <GoogleLogin
                                    onSuccess={(credentialResponse) => handleGoogleLogin(credentialResponse.credential)}
                                    onError={() => setError("Đăng nhập Google không thành công.")}
                                    text="continue_with"
                                    theme="outline"
                                    size="large"
                                    shape="rectangular"
                                    width="360"
                                    logo_alignment="left"
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <button type="button" disabled className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-white/15 bg-white px-4 text-sm font-medium text-slate-700 opacity-60">
                                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
                                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.66 5.94c4.47-4.13 7.12-10.2 7.12-17.59Z" />
                                        <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
                                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.86l-7.66-5.94c-2.13 1.43-4.86 2.28-8.24 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
                                    </svg>
                                    <span>Tiếp tục với Google</span>
                                </button>
                                <p className="text-center text-xs text-amber-100/70">Client ID đã thêm vào `.env`? Hãy khởi động lại `npm start` để React nạp cấu hình.</p>
                            </div>
                        )}
                        <p className="mt-5 text-center text-sm text-white/55">
                            {isRegistering ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
                            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(""); setMessage(""); }} className="font-medium text-[#c9ff86] hover:underline">
                                {isRegistering ? "Đăng nhập" : "Đăng ký"}
                            </button>
                        </p>
                    </section>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
                        <section className="rounded-2xl border border-white/10 bg-[#172124] p-6 sm:p-8">
                            <p className="text-sm font-medium text-[#c9ff86]">Xin chào, {user.displayName}</p>
                            <h2 className="mt-2 text-2xl font-semibold">Bắt đầu cuộc họp</h2>
                            <p className="mt-2 text-sm text-white/55">Tạo phòng mới hoặc nhập room ID do người khác gửi.</p>
                            <div className="mt-6"><Join /></div>
                            <form onSubmit={joinRoom} className="mt-5 flex flex-col gap-2 sm:flex-row">
                                <input aria-label="Room ID" placeholder="Nhập room ID" value={roomId} onChange={(event) => setRoomId(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#101719] px-3 text-white outline-none focus:border-[#b8f36b]" />
                                <button type="submit" disabled={!roomId.trim()} className="min-h-11 rounded-lg bg-white/10 px-5 font-medium hover:bg-white/15 disabled:opacity-40">Tham gia phòng</button>
                            </form>
                        </section>

                        <section className="rounded-2xl border border-white/10 bg-[#172124] p-6">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold">Phòng đã tạo</h2>
                                    <p className="mt-1 text-xs text-white/45">Tối đa 100 phòng gần nhất</p>
                                </div>
                                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60">{history.length}</span>
                            </div>
                            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                                {history.length === 0 ? <p className="py-5 text-sm text-white/45">Chưa có phòng nào được tạo.</p> : history.map((room) => (
                                    <button key={room.roomId} type="button" onClick={() => navigate(`/room/${room.roomId}`)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#101719] p-3 text-left transition hover:border-white/15">
                                        <span className="min-w-0">
                                            <span className="block truncate font-mono text-xs text-white/80">{room.roomId}</span>
                                            <span className="mt-1 block text-xs text-white/40">{new Date(room.createdAt).toLocaleString()} · {room.participantCount} người</span>
                                        </span>
                                        <span className="flex-none text-xs tabular-nums text-white/60">{Math.floor(room.durationMs / 60000)} phút</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    )
}
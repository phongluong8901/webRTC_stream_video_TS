import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MediaPreferences, RoomContext } from "../context/RoomContext";
import { useContext } from "react";
import { BackgroundPreset } from "../services/virtualBackground";
import { VideoPlayer } from "../components/VideoPlayer";

const backgroundOptions: Array<{ id: BackgroundPreset; title: string; description: string; swatch: string }> = [
    { id: "none", title: "Gốc", description: "Giữ nguyên hậu cảnh camera", swatch: "bg-[#283437]" },
    { id: "blur", title: "Làm mờ", description: "Làm mờ hậu cảnh, giữ rõ người", swatch: "bg-gradient-to-br from-[#697b80] to-[#283437]" },
    { id: "mint", title: "Xanh dịu", description: "Nền xanh mint", swatch: "bg-gradient-to-br from-[#80b7a2] to-[#123b3a]" },
    { id: "sunset", title: "Hoàng hôn", description: "Nền tím cam ấm", swatch: "bg-gradient-to-br from-[#e8a36d] to-[#4b263d]" },
    { id: "lavender", title: "Lavender", description: "Nền tím nhẹ", swatch: "bg-gradient-to-br from-[#a79bd4] to-[#2d3155]" },
];

interface RoomMediaSettings {
    stream?: MediaStream;
    mediaPreferences: MediaPreferences;
    availableMediaDevices: {
        cameras: MediaDeviceInfo[];
        microphones: MediaDeviceInfo[];
    };
    refreshMediaDevices: () => Promise<void>;
    applyMediaPreferences: (preferences: MediaPreferences) => Promise<void>;
}

export const ProfileSettings = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const {
        stream,
        mediaPreferences,
        availableMediaDevices,
        refreshMediaDevices,
        applyMediaPreferences,
    } = useContext(RoomContext) as RoomMediaSettings;
    const [draft, setDraft] = useState(mediaPreferences);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const [testingMic, setTestingMic] = useState(false);
    const [micLevel, setMicLevel] = useState(0);
    const animationFrame = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (!loading && !user) navigate("/", { replace: true });
    }, [loading, navigate, user]);

    useEffect(() => setDraft(mediaPreferences), [mediaPreferences]);
    useEffect(() => {
        void refreshMediaDevices().catch(() => setError("Không đọc được danh sách thiết bị media."));
    }, [refreshMediaDevices]);

    useEffect(() => {
        if (!testingMic || !stream?.getAudioTracks().length) {
            setMicLevel(0);
            return;
        }

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
        source.connect(analyser);
        const samples = new Uint8Array(analyser.frequencyBinCount);
        let active = true;
        const measure = () => {
            if (!active) return;
            analyser.getByteFrequencyData(samples);
            const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
            setMicLevel(Math.min(100, Math.round(average * 2.5)));
            animationFrame.current = window.requestAnimationFrame(measure);
        };
        void audioContext.resume().then(measure);

        return () => {
            active = false;
            if (animationFrame.current) window.cancelAnimationFrame(animationFrame.current);
            source.disconnect();
            analyser.disconnect();
            void audioContext.close();
        };
    }, [stream, testingMic]);

    const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            await applyMediaPreferences(draft);
            setNotice("Đã lưu cài đặt thiết bị và nền video.");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Không áp dụng được cài đặt media.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !user) {
        return <main className="grid min-h-screen place-items-center bg-[#101719] text-white">Đang kiểm tra đăng nhập...</main>;
    }

    return (
        <main className="min-h-screen bg-[#101719] px-4 py-8 text-white sm:px-8">
            <div className="mx-auto max-w-5xl">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div>
                        <button type="button" onClick={() => navigate("/")} className="mb-2 text-sm text-white/55 hover:text-white">← Quay lại trang chủ</button>
                        <h1 className="text-2xl font-semibold">Hồ sơ & cài đặt</h1>
                        <p className="mt-1 text-sm text-white/50">Quản lý tài khoản và thiết bị dùng trong cuộc họp.</p>
                    </div>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">Email đã xác minh</span>
                </header>

                <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <section className="h-fit rounded-xl border border-white/10 bg-[#172124] p-5">
                        <h2 className="font-semibold">Thông tin tài khoản</h2>
                        <div className="mt-5 space-y-4">
                            <label className="block text-sm text-white/50">Tên hiển thị
                                <input readOnly value={user.displayName} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-[#101719] px-3 text-white/80" />
                            </label>
                            <label className="block text-sm text-white/50">Email
                                <input readOnly value={user.email} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-[#101719] px-3 text-white/80" />
                            </label>
                        </div>
                    </section>

                    <form onSubmit={saveSettings} className="space-y-5">
                        <section className="rounded-xl border border-white/10 bg-[#172124] p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold">Camera & microphone</h2>
                                    <p className="mt-1 text-xs text-white/45">Các lựa chọn được dùng cho cuộc họp hiện tại và lần sau trên trình duyệt này.</p>
                                </div>
                                <button type="button" onClick={() => setTestingMic((current) => !current)} disabled={!stream?.getAudioTracks().length} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5 disabled:opacity-40">
                                    {testingMic ? "Dừng thử mic" : "Thử microphone"}
                                </button>
                            </div>

                            <div className="mt-4 aspect-video max-h-64 overflow-hidden rounded-lg border border-white/10 bg-[#101719]">
                                {stream ? <VideoPlayer stream={stream} /> : <div className="grid h-full place-items-center text-sm text-white/45">Camera chưa sẵn sàng</div>}
                            </div>

                            <label className="mt-5 block text-sm text-white/60">Camera
                                <select value={draft.cameraDeviceId} onChange={(event) => setDraft((current) => ({ ...current, cameraDeviceId: event.target.value }))} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-[#101719] px-3 text-white">
                                    <option value="">Camera mặc định</option>
                                    {availableMediaDevices.cameras.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
                                </select>
                            </label>

                            <label className="mt-4 block text-sm text-white/60">Microphone
                                <select value={draft.microphoneDeviceId} onChange={(event) => setDraft((current) => ({ ...current, microphoneDeviceId: event.target.value }))} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-[#101719] px-3 text-white">
                                    <option value="">Microphone mặc định</option>
                                    {availableMediaDevices.microphones.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
                                </select>
                            </label>

                            <div className="mt-4 flex items-center gap-3" aria-label="Mức âm thanh microphone">
                                <span className="text-xs text-white/45">Âm thanh</span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-[#b8f36b] transition-[width]" style={{ width: `${micLevel}%` }} />
                                </div>
                            </div>
                            {!stream?.getAudioTracks().length && <p className="mt-3 text-xs text-amber-100/70">Chưa cấp quyền microphone. Hãy cho phép truy cập khi trình duyệt hỏi.</p>}
                        </section>

                        <section className="rounded-xl border border-white/10 bg-[#172124] p-5">
                            <div>
                                <h2 className="font-semibold">Background</h2>
                                <p className="mt-1 text-xs text-white/45">Nền ảo được xử lý trên máy bạn bằng MediaPipe, không tải video lên server.</p>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {backgroundOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        aria-pressed={draft.background === option.id}
                                        onClick={() => setDraft((current) => ({ ...current, background: option.id }))}
                                        className={`overflow-hidden rounded-lg border text-left transition ${draft.background === option.id ? "border-[#b8f36b] ring-1 ring-[#b8f36b]" : "border-white/10 hover:border-white/30"}`}
                                    >
                                        <span className={`block h-16 ${option.swatch}`} />
                                        <span className="block px-2.5 py-2">
                                            <span className="block text-xs font-medium">{option.title}</span>
                                            <span className="mt-0.5 block text-[10px] leading-4 text-white/40">{option.description}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {draft.background !== "none" && <p className="mt-3 text-xs text-white/45">Tải model lần đầu cần kết nối internet. Camera có thể dùng thêm tài nguyên CPU/GPU.</p>}
                        </section>

                        {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
                        {notice && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
                        <div className="flex justify-end">
                            <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-[#b8f36b] px-5 font-semibold text-[#172124] hover:bg-[#c9ff86] disabled:opacity-50">
                                {saving ? "Đang áp dụng..." : "Lưu cài đặt"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
};

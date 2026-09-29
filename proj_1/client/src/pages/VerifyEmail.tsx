import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const { verifyEmail } = useAuth();
    const [status, setStatus] = useState("Đang xác minh email...");
    const [failed, setFailed] = useState(false);
    const verificationStarted = useRef(false);

    useEffect(() => {
        if (verificationStarted.current) return;
        verificationStarted.current = true;
        const token = searchParams.get("token");
        if (!token) {
            setStatus("Liên kết xác minh không hợp lệ.");
            setFailed(true);
            return;
        }

        verifyEmail(token)
            .then(() => setStatus("Email đã được xác minh. Bạn đã đăng nhập thành công."))
            .catch((error: Error) => {
                setStatus(error.message);
                setFailed(true);
            });
    }, [searchParams, verifyEmail]);

    return (
        <main className="grid min-h-screen place-items-center bg-[#101719] px-4 text-white">
            <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#172124] p-8 text-center">
                <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${failed ? "bg-rose-400/15 text-rose-200" : "bg-emerald-400/15 text-emerald-200"}`}>
                    {failed ? "!" : "✓"}
                </div>
                <h1 className="mt-5 text-xl font-semibold">Xác minh email</h1>
                <p role="status" className="mt-3 text-sm text-white/65">{status}</p>
                <Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#b8f36b] px-5 font-semibold text-[#172124]">Về trang chủ</Link>
            </section>
        </main>
    );
};

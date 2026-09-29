import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest } from "../services/api";

export interface AuthUser {
    id: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
}

interface AuthContextValue {
    user?: AuthUser;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName: string) => Promise<string>;
    googleLogin: (credential: string) => Promise<void>;
    verifyEmail: (token: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        apiRequest<{ user: AuthUser }>("/api/auth/me")
            .then(({ user: currentUser }) => {
                if (active) setUser(currentUser);
            })
            .catch(() => {
                if (active) setUser(undefined);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const result = await apiRequest<{ user: AuthUser }>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        setUser(result.user);
    }, []);

    const register = useCallback(async (email: string, password: string, displayName: string) => {
        const result = await apiRequest<{ message: string }>("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password, displayName }),
        });
        return result.message;
    }, []);

    const googleLogin = useCallback(async (credential: string) => {
        const result = await apiRequest<{ user: AuthUser }>("/api/auth/google", {
            method: "POST",
            body: JSON.stringify({ credential }),
        });
        setUser(result.user);
    }, []);

    const verifyEmail = useCallback(async (token: string) => {
        const result = await apiRequest<{ user: AuthUser }>("/api/auth/verify-email", {
            method: "POST",
            body: JSON.stringify({ token }),
        });
        setUser(result.user);
    }, []);

    const logout = useCallback(async () => {
        await apiRequest<void>("/api/auth/logout", { method: "POST" });
        setUser(undefined);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, googleLogin, verifyEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
};

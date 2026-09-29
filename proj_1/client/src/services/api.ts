function resolveApiUrl(): string {
  // Khi UI duoc Express serve (Electron :18080 / production), API cung origin.
  // Chi CRA dev (:3000) moi goi backend rieng.
  if (typeof window !== "undefined" && window.location.port !== "3000") {
    return window.location.origin;
  }
  return process.env.REACT_APP_API_URL || "http://localhost:8080";
}

export const API_URL = resolveApiUrl();

export const apiRequest = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const body = response.status === 204 ? undefined : await response.json();
  if (!response.ok) {
    throw new Error(body?.error || "Yêu cầu không thành công.");
  }
  return body as T;
};

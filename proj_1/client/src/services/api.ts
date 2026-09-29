export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

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

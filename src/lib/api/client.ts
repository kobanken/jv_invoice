type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_VITE_API_BASE_URL ||
  "/api";

export const apiBaseUrl = configuredBaseUrl.replace(/\/$/, "");

export async function apiGet<T>(path: string, params?: Record<string, string | number | null | undefined>): Promise<T> {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  query.set("_ts", String(Date.now()));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<T>(`${path}${suffix}`);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? "API通信に失敗しました。");
  }
  return payload.data as T;
}

/** A failed API call, carrying the HTTP status and the backend's message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Calls a same-origin JSON API route. The session cookie travels with every
 * request, so this only works when FastAPI serves the built app.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json" } });
  if (!response.ok) {
    // Unhandled server errors are plain text, and validation errors carry a list, not a sentence.
    const { detail } = await response.json().catch(() => ({}));
    throw new ApiError(response.status, typeof detail === "string" ? detail : "Something went wrong. Please try again.");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

/** POSTs a JSON body. */
export function post<T>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

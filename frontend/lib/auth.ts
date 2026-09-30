import { api, ApiError, post } from "@/lib/api";

export interface User {
  id: number;
  email: string;
}

export interface Credentials {
  email: string;
  password: string;
}

/** The signed-in user, from the session cookie, or null when signed out. */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await api<User>("/api/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export const signUp = (credentials: Credentials) => post<User>("/api/auth/signup", credentials);
export const signIn = (credentials: Credentials) => post<User>("/api/auth/signin", credentials);
export const signOut = () => post<void>("/api/auth/signout");

/** True when an API call failed because the session has ended, e.g. after a server restart. */
export const isSignedOut = (error: unknown) => error instanceof ApiError && error.status === 401;

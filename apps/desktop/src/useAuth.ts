import type { PublicUser } from "@gestion-notas/application";
import { useCallback, useState } from "react";

const SESSION_KEY = "gestion-notas:session";

function readSession(): PublicUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<PublicUser | null>(() => readSession());

  const login = useCallback((sessionUser: PublicUser) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return { user, login, logout, isAuthenticated: user !== null };
}

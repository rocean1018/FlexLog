"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { hydrateStoreForUser, setStoreUser } from "@/lib/storage";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  ready: boolean;
  supabaseAvailable: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error?: string | null }>;
  signOut: () => Promise<{ error?: string | null }>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: false,
  ready: false,
  supabaseAvailable: Boolean(supabase),
  signUp: async () => ({ error: "Auth not configured" }),
  signIn: async () => ({ error: "Auth not configured" }),
  signOut: async () => ({ error: "Auth not configured" }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const supabaseReady = Boolean(supabase);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let ignore = false;
    supabase.auth.getSession().then(({ data }) => {
      if (ignore) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });
    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  const loading = ready && supabaseReady ? false : !ready;

  const ctx = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      ready,
      supabaseAvailable: supabaseReady,
      signUp: async (email, password) => {
        if (!supabase) return { error: "Auth not configured" };
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message };
      },
      signIn: async (email, password) => {
        if (!supabase) return { error: "Auth not configured" };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message };
      },
      signOut: async () => {
        if (!supabase) return { error: "Auth not configured" };
        const { error } = await supabase.auth.signOut();
        return { error: error?.message };
      },
    }),
    [session, user, loading, ready, supabaseReady],
  );

  // Sync store with user context so snapshots follow the signed-in user
  useEffect(() => {
    setStoreUser(user?.id ?? null);
    if (user?.id) {
      hydrateStoreForUser(user.id).catch((err) => {
        console.warn("Failed to hydrate store for user", err);
      });
    }
  }, [user?.id]);

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

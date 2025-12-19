"use client";

import { useState } from "react";
import Link from "next/link";
import { StickyHeader } from "@/components/StickyHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "@/components/ui/Toaster";

export default function AuthPage() {
  const { signIn, signUp, signOut, user, supabaseAvailable } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseAvailable) {
      toast.error("Supabase auth is not configured.");
      return;
    }
    setLoading(true);
    const action = mode === "signup" ? signUp : signIn;
    const { error } = await action(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(mode === "signup" ? "Check your email to confirm your account." : "Welcome back!");
    }
  }

  async function handleSignOut() {
    setLoading(true);
    const { error } = await signOut();
    setLoading(false);
    if (error) toast.error(error);
    else toast.success("Signed out");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <StickyHeader
        title="Account"
        subtitle={user ? `Signed in as ${user.email}` : "Create an account or sign in"}
        right={
          <Link href="/log">
            <Button variant="secondary">Back to log</Button>
          </Link>
        }
      />

      <Card>
        {!supabaseAvailable ? (
          <div className="text-sm text-zinc-400">
            Set <span className="text-zinc-200">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="text-zinc-200">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to enable Supabase Auth.
          </div>
        ) : null}

        {user ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-zinc-950/40 p-4 ring-1 ring-zinc-800">
              <div className="text-sm text-zinc-400">Currently signed in</div>
              <div className="text-lg font-semibold">{user.email}</div>
            </div>
            <Button variant="destructive" onClick={handleSignOut} disabled={loading}>
              Sign out
            </Button>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "signup" ? "primary" : "ghost"}
                onClick={() => setMode("signup")}
                className="flex-1"
              >
                Create account
              </Button>
              <Button
                type="button"
                variant={mode === "signin" ? "primary" : "ghost"}
                onClick={() => setMode("signin")}
                className="flex-1"
              >
                Sign in
              </Button>
            </div>
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
            <Button type="submit" disabled={loading || !supabaseAvailable}>
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
            {mode === "signup" ? (
              <p className="text-xs text-zinc-500">
                You&apos;ll receive a confirmation email. The account becomes active once confirmed.
              </p>
            ) : null}
          </form>
        )}
      </Card>
    </div>
  );
}

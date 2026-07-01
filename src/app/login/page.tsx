"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/logo";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/inbox";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo className="text-3xl" />
          <CardDescription className="mt-1">
            One inbox for every conversation. Sign in to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sent ? (
            <p className="text-center text-sm text-gray-600">
              Check your email — we sent you a magic sign-in link. ✉️
            </p>
          ) : (
            <>
              <Button variant="outline" onClick={signInWithGoogle}>
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="h-px flex-1 bg-gray-200" />
                or
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <form onSubmit={signInWithEmail} className="flex flex-col gap-3">
                <Input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" disabled={loading}>
                  {loading ? "Sending…" : "Send magic link"}
                </Button>
              </form>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <p className="text-center text-xs text-gray-400">
                14-day free trial · No credit card required
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

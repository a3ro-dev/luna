"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const field =
  "block h-12 w-full min-w-0 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-surface)] px-4 text-base text-[var(--tier-ink)] transition-colors placeholder:text-[var(--tier-muted)]/70 hover:border-[var(--tier-accent)] focus:border-[var(--tier-accent)] aria-[invalid=true]:border-[#B4485F]/60";
const label = "mb-2 block text-sm font-medium text-[var(--tier-ink)]";
const inlineLink =
  "font-medium text-[var(--tier-ink)] underline decoration-[#FFB5C0] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--tier-ink)]";

export default function LoginPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("That email and password don't match. Please try again.");
      setIsLoading(false);
    } else {
      // Send login notification (non-blocking)
      fetch("/api/auth/login-notification", { method: "POST" }).catch(() => {});
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <main className="tier-app relative isolate flex flex-col overflow-x-clip px-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] font-sans selection:bg-[#FFDDE0] sm:items-center sm:justify-center sm:py-12">
      {/* A quiet crescent in the margin, like a mark in a journal */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-16 -z-10 size-72 rounded-full bg-[#FFDDE0]/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-8 top-[calc(env(safe-area-inset-top)+5rem)] -z-10 size-20 rounded-full shadow-[inset_-12px_8px_0_0_rgba(214,203,227,0.7)] sm:right-[12%] sm:top-24 sm:size-28"
      />

      <div className="mx-auto flex w-full max-w-sm min-w-0 flex-1 flex-col sm:max-w-md sm:flex-none sm:rounded-[2.5rem] sm:border sm:border-white/70 sm:bg-white/60 sm:p-10 sm:shadow-[0_30px_60px_rgba(255,181,192,0.12)] sm:backdrop-blur-2xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full font-serif text-2xl text-[var(--tier-ink)]"
        >
          <Image
            src="/luna.png"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full"
          />
          Luna
        </Link>

        <header className="mt-auto pt-14 sm:mt-8 sm:pt-0">
          <h1 className="font-serif text-[2.5rem] leading-[1.05] text-[var(--tier-ink)] sm:text-[2.75rem]">
            Welcome back.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[var(--tier-muted)]">
            Sign in to pick up where you left off.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className={label}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              className={field}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className={label}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                className={`${field} pr-20`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-controls="password"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-1 my-auto h-11 min-w-11 rounded-xl px-3 text-sm font-medium text-[var(--tier-muted)] transition-colors hover:text-[var(--tier-ink)]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p
              id="login-error"
              role="alert"
              className="rounded-2xl bg-[#FFB5C0]/15 px-4 py-3 text-sm text-[#B4485F]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="tier-primary-action h-12 w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && (
              <span
                aria-hidden
                className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
              />
            )}
            {isLoading ? "Signing in" : "Sign in"}
          </button>
          <p role="status" className="sr-only">
            {isLoading ? "Signing you in" : ""}
          </p>

          <div className="flex justify-center">
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-[var(--tier-muted)] transition-colors hover:text-[var(--tier-ink)]"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      </div>

      <p className="mx-auto mt-6 w-full max-w-sm text-center text-sm text-[var(--tier-muted)] sm:mt-8">
        New to Luna?{" "}
        <Link href="/signup" className={inlineLink}>
          Create an account
        </Link>
      </p>
    </main>
  );
}

"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const field =
  "block h-12 w-full min-w-0 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-surface)] px-4 text-base text-[var(--tier-ink)] transition-colors placeholder:text-[var(--tier-muted)]/70 hover:border-[var(--tier-accent)] focus:border-[var(--tier-accent)] aria-[invalid=true]:border-[#B4485F]/60";
const label = "mb-2 block text-sm font-medium text-[var(--tier-ink)]";
const hint = "mt-2 text-sm text-[var(--tier-muted)]";
const inlineLink =
  "font-medium text-[var(--tier-ink)] underline decoration-[#FFB5C0] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--tier-ink)]";

export default function SignupPageClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setIsLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        // Account created but auto-login failed — send to login
        router.push("/login");
      } else {
        router.replace("/onboarding");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="tier-app relative isolate flex flex-col overflow-x-clip px-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] font-sans selection:bg-[#FFDDE0] sm:items-center sm:justify-center sm:py-12">
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
            Make Luna yours.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[var(--tier-muted)]">
            One quiet place for your cycle. Setup takes about a minute.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="name" className={label}>
              What should Luna call you?{" "}
              <span className="font-normal text-[var(--tier-muted)]">
                Optional
              </span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={field}
            />
          </div>

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
              aria-describedby={error ? "signup-error" : undefined}
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={128}
                aria-describedby="password-hint"
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
            <p id="password-hint" className={hint}>
              At least 6 characters.
            </p>
          </div>

          {error && (
            <p
              id="signup-error"
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
            {isLoading ? "Creating your account" : "Create account"}
          </button>
          <p role="status" className="sr-only">
            {isLoading ? "Creating your account" : ""}
          </p>

          <p className="text-center text-sm leading-relaxed text-[var(--tier-muted)]">
            By signing up, you agree to our{" "}
            <Link href="/terms" target="_blank" className={inlineLink}>
              Terms of Use
            </Link>
            ,{" "}
            <Link href="/privacy" target="_blank" className={inlineLink}>
              Privacy Policy
            </Link>
            , and acknowledge our{" "}
            <Link href="/transparency" target="_blank" className={inlineLink}>
              Transparency
            </Link>{" "}
            page.
          </p>
        </form>
      </div>

      <p className="mx-auto mt-6 w-full max-w-sm text-center text-sm text-[var(--tier-muted)] sm:mt-8">
        Already have an account?{" "}
        <Link href="/login" className={inlineLink}>
          Sign in
        </Link>
      </p>
    </main>
  );
}

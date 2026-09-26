"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

const field =
  "block h-12 w-full min-w-0 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-surface)] px-4 text-base text-[var(--tier-ink)] transition-colors placeholder:text-[var(--tier-muted)]/70 hover:border-[var(--tier-accent)] focus:border-[var(--tier-accent)] aria-[invalid=true]:border-[#B4485F]/60";
const inlineLink =
  "font-medium text-[var(--tier-ink)] underline decoration-[#FFB5C0] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--tier-ink)]";

export default function ForgotPasswordPageClient() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);

  // The form (and its focused button) unmounts on success; move focus to the
  // confirmation so screen readers announce it and keyboard users keep their place.
  useEffect(() => {
    if (sent) sentHeadingRef.current?.focus();
  }, [sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setIsLoading(false);
        return;
      }

      // Always show success to prevent email enumeration
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
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

        {sent ? (
          <div className="mt-auto pt-14 sm:mt-8 sm:pt-0">
            <div className="mb-6 grid size-14 place-items-center rounded-full bg-[#FFDDE0]/50">
              <svg
                aria-hidden
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B45A75"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1
              ref={sentHeadingRef}
              tabIndex={-1}
              aria-describedby="sent-detail"
              className="font-serif text-[2.5rem] leading-[1.05] text-[var(--tier-ink)] outline-none sm:text-[2.75rem]"
            >
              Check your inbox.
            </h1>
            <p
              id="sent-detail"
              className="mt-3 break-words text-base leading-relaxed text-[var(--tier-muted)]"
            >
              If an account exists for{" "}
              <strong className="font-medium text-[var(--tier-ink)]">
                {email}
              </strong>
              , you&apos;ll receive a password reset link shortly. The link
              expires in 1 hour.
            </p>
            <Link
              href="/login"
              className="tier-primary-action mt-8 h-12 w-full"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <header className="mt-auto pt-14 sm:mt-8 sm:pt-0">
              <h1 className="font-serif text-[2.5rem] leading-[1.05] text-[var(--tier-ink)] sm:text-[2.75rem]">
                Forgot your password?
              </h1>
              <p className="mt-3 text-base leading-relaxed text-[var(--tier-muted)]">
                It happens. Enter the email you signed up with and we&apos;ll
                send you a reset link.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[var(--tier-ink)]"
                >
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
                  aria-describedby={error ? "forgot-error" : undefined}
                  className={field}
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <p
                  id="forgot-error"
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
                {isLoading ? "Sending" : "Send reset link"}
              </button>
              <p role="status" className="sr-only">
                {isLoading ? "Sending your reset link" : ""}
              </p>
            </form>
          </>
        )}
      </div>

      <p className="mx-auto mt-6 w-full max-w-sm text-center text-sm text-[var(--tier-muted)] sm:mt-8">
        Remember your password?{" "}
        <Link href="/login" className={inlineLink}>
          Sign in
        </Link>
      </p>
    </main>
  );
}

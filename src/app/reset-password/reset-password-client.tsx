"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const field =
  "block h-12 w-full min-w-0 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-surface)] px-4 text-base text-[var(--tier-ink)] transition-colors placeholder:text-[var(--tier-muted)]/70 hover:border-[var(--tier-accent)] focus:border-[var(--tier-accent)] aria-[invalid=true]:border-[#B4485F]/60";
const label = "mb-2 block text-sm font-medium text-[var(--tier-ink)]";
const heading =
  "font-serif text-[2.5rem] leading-[1.05] text-[var(--tier-ink)] sm:text-[2.75rem]";
const lede = "mt-3 text-base leading-relaxed text-[var(--tier-muted)]";
const inlineLink =
  "font-medium text-[var(--tier-ink)] underline decoration-[#FFB5C0] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--tier-ink)]";

function Shell({
  children,
  footer = true,
}: {
  children: React.ReactNode;
  footer?: boolean;
}) {
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
        <div className="mt-auto pt-14 sm:mt-8 sm:pt-0">{children}</div>
      </div>

      {footer && (
        <p className="mx-auto mt-6 w-full max-w-sm text-center text-sm text-[var(--tier-muted)] sm:mt-8">
          Remember your password?{" "}
          <Link href="/login" className={inlineLink}>
            Sign in
          </Link>
        </p>
      )}
    </main>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const tokenValid = Boolean(token);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  // The form (and its focused button) unmounts on success; move focus to the
  // confirmation so it is announced before the redirect.
  useEffect(() => {
    if (success) successHeadingRef.current?.focus();
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValid === false) {
    return (
      <Shell>
        <div className="mb-6 grid size-14 place-items-center rounded-full bg-[#FFB5C0]/15">
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
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 className={heading}>This link isn&apos;t working.</h1>
        <p className={lede}>
          This reset link is invalid or has expired. Request a new one and
          we&apos;ll send it right over.
        </p>
        <Link
          href="/forgot-password"
          className="tier-primary-action mt-8 h-12 w-full"
        >
          Request a new link
        </Link>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell footer={false}>
        <div>
          <div className="mb-6 grid size-14 place-items-center rounded-full bg-[#D6CBE3]/40">
            <svg
              aria-hidden
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6D5A60"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1
            ref={successHeadingRef}
            tabIndex={-1}
            aria-describedby="success-detail"
            className={`${heading} outline-none`}
          >
            You&apos;re all set.
          </h1>
          <p id="success-detail" className={lede}>
            Your password has been updated. Taking you to sign in...
          </p>
        </div>
        <Link href="/login" className="tier-primary-action mt-8 h-12 w-full">
          Sign in now
        </Link>
      </Shell>
    );
  }

  const describedBy = error ? "reset-error" : undefined;

  return (
    <Shell>
      <header>
        <h1 className={heading}>Choose a new password.</h1>
        <p className={lede}>
          Something you&apos;ll remember, at least 6 characters.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="new-password" className={label}>
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              name="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              maxLength={128}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className={`${field} pr-20`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-controls="new-password confirm-password"
              aria-label={showPassword ? "Hide passwords" : "Show passwords"}
              className="absolute inset-y-0 right-1 my-auto h-11 min-w-11 rounded-xl px-3 text-sm font-medium text-[var(--tier-muted)] transition-colors hover:text-[var(--tier-ink)]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className={label}>
            Confirm password
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            maxLength={128}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={field}
          />
        </div>

        {error && (
          <p
            id="reset-error"
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
          {isLoading ? "Saving" : "Save new password"}
        </button>
        <p role="status" className="sr-only">
          {isLoading ? "Saving your new password" : ""}
        </p>
      </form>
    </Shell>
  );
}

export default function ResetPasswordPageClient() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="tier-app flex items-center justify-center"
        >
          <span
            aria-hidden
            className="size-5 animate-spin rounded-full border-2 border-[#FFB5C0]/30 border-t-[#FFB5C0]"
          />
          <span className="sr-only">Loading</span>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

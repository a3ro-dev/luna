"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { spring } from "@/lib/motion";

// One inset group with a hairline between rows, like Settings > Change
// Password. The row shows the focus ring as an inset outline: it follows the
// rounded corners and paints above an autofilled input, and forced-colors
// mode keeps it.
const row =
  "relative flex min-h-11 items-center gap-3 px-4 first:rounded-t-[1.125rem] last:rounded-b-[1.125rem] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-[var(--tint)] not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:border-t not-first:before:border-[var(--separator)]";
const rowLabel = "w-[5.5rem] shrink-0 text-[17px] text-[var(--tier-ink)]";
const rowInput =
  "h-11 min-w-0 flex-1 bg-transparent text-[17px] text-[var(--tier-ink)] outline-hidden! placeholder:text-[var(--label-tertiary)] autofill:shadow-[inset_0_0_0_100px_var(--tier-surface)] autofill:[-webkit-text-fill-color:var(--tier-ink)]";
const primaryButton =
  "inline-flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--tint)] px-5 text-[17px] font-semibold tracking-[-0.022em] text-[var(--tier-surface)] transition-[background-color,scale] duration-150 hover:bg-[color-mix(in_oklch,var(--tint)_85%,var(--tier-ink))] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
const title =
  "font-display text-[2.125rem] leading-[1.1] font-bold tracking-[-0.026em] text-balance text-[var(--tier-ink)]";
const lede =
  "mt-2 text-[15px] leading-snug text-pretty text-[var(--label-secondary)]";
const statusIcon =
  "mx-auto mb-5 grid size-16 place-items-center rounded-full bg-[var(--tier-tint)] text-[var(--tint)]";

function Shell({
  children,
  footer = true,
}: {
  children: React.ReactNode;
  footer?: boolean;
}) {
  return (
    // The global focus outline uses --tier-accent (about 2:1); recolour it to
    // --tint so every control's focus reads at 3:1 or better.
    <main className="tier-app flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.25rem)] font-sans selection:bg-[var(--tier-tint)] sm:justify-center sm:py-16 [&_:focus-visible]:outline-[var(--tint)]!">
      <div className="mx-auto w-full max-w-[22.5rem] min-w-0">
        <Link
          href="/"
          className="mx-auto flex min-h-11 w-fit items-center gap-2 rounded-full font-serif text-[1.25rem] leading-none text-[var(--tier-ink)]"
        >
          <Image
            src="/luna.png"
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-full"
          />
          Luna
        </Link>
        <div className="mt-10">{children}</div>
      </div>

      {footer && (
        <p className="mx-auto mt-auto flex w-full max-w-[22.5rem] flex-wrap items-center justify-center gap-x-1 pt-10 text-[15px] text-[var(--label-secondary)] sm:mt-8 sm:pt-0">
          Remember your password?
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-lg font-medium text-[var(--tint)] underline-offset-4 hover:underline"
          >
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
        <div className="text-center">
          <div className={statusIcon}>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className={title}>This link isn&apos;t working</h1>
          <p className={lede}>
            This reset link is invalid or has expired. Request a new one and
            we&apos;ll send it right over.
          </p>
          <Link href="/forgot-password" className={`${primaryButton} mt-8`}>
            Request a new link
          </Link>
        </div>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell footer={false}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={spring.smooth}
          className="text-center"
        >
          <div className={statusIcon}>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1
            ref={successHeadingRef}
            tabIndex={-1}
            aria-describedby="success-detail"
            className={`${title} outline-none`}
          >
            You&apos;re all set
          </h1>
          <p id="success-detail" className={lede}>
            Your password has been updated. Taking you to sign in…
          </p>
          <Link href="/login" className={`${primaryButton} mt-8`}>
            Sign in now
          </Link>
        </motion.div>
      </Shell>
    );
  }

  const describedBy = error ? "reset-error" : undefined;

  return (
    <Shell>
      <header className="text-center">
        <h1 className={title}>Choose a new password</h1>
        <p className={lede}>
          Something you&apos;ll remember, at least 6 characters.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="grouped">
          <div className={row}>
            <label htmlFor="new-password" className={rowLabel}>
              New<span className="sr-only"> password</span>
            </label>
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
              className={rowInput}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-controls="new-password confirm-password"
              aria-label={showPassword ? "Hide passwords" : "Show passwords"}
              className="-mr-2.5 min-h-11 min-w-11 shrink-0 cursor-pointer rounded-lg px-2.5 text-[15px] text-[var(--tint)] transition-opacity hover:opacity-70 focus-visible:outline-2! focus-visible:-outline-offset-2!"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <div className={row}>
            <label htmlFor="confirm-password" className={rowLabel}>
              Confirm<span className="sr-only"> password</span>
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
              className={rowInput}
            />
          </div>
        </div>

        {error && (
          <p
            id="reset-error"
            role="alert"
            className="px-4 pt-2 text-[15px] leading-snug text-[color-mix(in_oklch,var(--destructive)_70%,var(--tier-ink))]"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`${primaryButton} mt-6`}
        >
          {isLoading && (
            <span
              aria-hidden
              className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            />
          )}
          {isLoading ? "Saving…" : "Save new password"}
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
            className="size-6 animate-spin rounded-full border-2 border-[var(--separator)] border-t-[var(--tint)]"
          />
          <span className="sr-only">Loading</span>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

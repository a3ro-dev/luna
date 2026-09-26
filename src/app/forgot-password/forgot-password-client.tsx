"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { spring } from "@/lib/motion";

// One inset group, like Apple ID sign-in. The row shows the focus ring as an
// inset outline: it follows the rounded corners and paints above an autofilled
// input, and forced-colors mode keeps it.
const row =
  "relative flex min-h-11 items-center gap-3 rounded-[1.125rem] px-4 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-[var(--tint)]";
const rowInput =
  "h-11 min-w-0 flex-1 bg-transparent text-[17px] text-[var(--tier-ink)] outline-hidden! placeholder:text-[var(--label-tertiary)] autofill:shadow-[inset_0_0_0_100px_var(--tier-surface)] autofill:[-webkit-text-fill-color:var(--tier-ink)]";
const primaryButton =
  "inline-flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--tint)] px-5 text-[17px] font-semibold tracking-[-0.022em] text-[var(--tier-surface)] transition-[background-color,scale] duration-150 hover:bg-[color-mix(in_oklch,var(--tint)_85%,var(--tier-ink))] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
const quietLink =
  "inline-flex min-h-11 items-center rounded-lg text-[15px] font-medium text-[var(--tint)] underline-offset-4 hover:underline";
const title =
  "font-display text-[2.125rem] leading-[1.1] font-bold tracking-[-0.026em] text-balance text-[var(--tier-ink)]";
const lede =
  "mt-2 text-[15px] leading-snug text-pretty text-[var(--label-secondary)]";

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

        {sent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={spring.smooth}
            className="mt-10 text-center"
          >
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-[var(--tier-tint)] text-[var(--tint)]">
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
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1
              ref={sentHeadingRef}
              tabIndex={-1}
              aria-describedby="sent-detail"
              className={`${title} outline-none`}
            >
              Check your inbox
            </h1>
            <p id="sent-detail" className={`${lede} break-words`}>
              If an account exists for{" "}
              <strong className="font-semibold text-[var(--tier-ink)]">
                {email}
              </strong>
              , you&apos;ll receive a password reset link shortly. The link
              expires in 1 hour.
            </p>
            <Link href="/login" className={`${primaryButton} mt-8`}>
              Back to sign in
            </Link>
          </motion.div>
        ) : (
          <>
            <header className="mt-10 text-center">
              <h1 className={title}>Forgot your password?</h1>
              <p className={lede}>
                It happens. Enter the email you signed up with and we&apos;ll
                send you a reset link.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="mt-8">
              <div className="grouped">
                <div className={row}>
                  <label
                    htmlFor="email"
                    className="w-[5.5rem] shrink-0 text-[17px] text-[var(--tier-ink)]"
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
                    className={rowInput}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && (
                <p
                  id="forgot-error"
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
                {isLoading ? "Sending…" : "Send reset link"}
              </button>
              <p role="status" className="sr-only">
                {isLoading ? "Sending your reset link" : ""}
              </p>
            </form>
          </>
        )}
      </div>

      {/* Once sent, the primary button already leads back to sign in */}
      {!sent && (
        <p className="mx-auto mt-auto flex w-full max-w-[22.5rem] flex-wrap items-center justify-center gap-x-1 pt-10 text-[15px] text-[var(--label-secondary)] sm:mt-8 sm:pt-0">
          Remember your password?
          <Link href="/login" className={quietLink}>
            Sign in
          </Link>
        </p>
      )}
    </main>
  );
}

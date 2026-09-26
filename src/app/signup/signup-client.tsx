"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GroupedSection } from "@/components/apple/Grouped";

// One inset group with a hairline between rows, like Apple ID sign-in. The
// row shows the focus ring as an inset outline: it follows the rounded corners
// and paints above an autofilled input, and forced-colors mode keeps it.
const row =
  "relative flex min-h-11 items-center gap-3 px-4 first:rounded-t-[1.125rem] last:rounded-b-[1.125rem] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-[var(--tint)] not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:border-t not-first:before:border-[var(--separator)]";
const rowLabel = "w-[5.5rem] shrink-0 text-[17px] text-[var(--tier-ink)]";
const rowInput =
  "h-11 min-w-0 flex-1 bg-transparent text-[17px] text-[var(--tier-ink)] outline-hidden! placeholder:text-[var(--label-tertiary)] autofill:shadow-[inset_0_0_0_100px_var(--tier-surface)] autofill:[-webkit-text-fill-color:var(--tier-ink)]";
const revealButton =
  "-mr-2.5 min-h-11 min-w-11 shrink-0 cursor-pointer rounded-lg px-2.5 text-[15px] text-[var(--tint)] transition-opacity hover:opacity-70 focus-visible:outline-2! focus-visible:-outline-offset-2!";
const primaryButton =
  "inline-flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--tint)] px-5 text-[17px] font-semibold tracking-[-0.022em] text-[var(--tier-surface)] transition-[background-color,scale] duration-150 hover:bg-[color-mix(in_oklch,var(--tint)_85%,var(--tier-ink))] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
const quietLink =
  "inline-flex min-h-11 items-center rounded-lg text-[15px] text-[var(--tint)] underline-offset-4 hover:underline";
// Links inside running text keep an underline: hue alone is under 3:1 here.
const inlineLink =
  "text-[var(--tint)] underline decoration-[color-mix(in_oklch,var(--tint)_45%,transparent)] underline-offset-2 hover:decoration-current";

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

        <header className="mt-10 text-center">
          <h1 className="font-display text-[2.125rem] leading-[1.1] font-bold tracking-[-0.026em] text-balance text-[var(--tier-ink)]">
            Make Luna yours
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-pretty text-[var(--label-secondary)]">
            One quiet place for your cycle. Setup takes about a minute.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8">
          <GroupedSection
            footer={
              <span id="password-hint">
                Passwords need at least 6 characters.
              </span>
            }
          >
            <div className={row}>
              <label htmlFor="name" className={rowLabel}>
                Name
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
                className={rowInput}
                placeholder="Optional"
              />
            </div>
            <div className={row}>
              <label htmlFor="email" className={rowLabel}>
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
                className={rowInput}
                placeholder="you@example.com"
              />
            </div>
            <div className={row}>
              <label htmlFor="password" className={rowLabel}>
                Password
              </label>
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
                className={rowInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-controls="password"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className={revealButton}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </GroupedSection>

          {error && (
            <p
              id="signup-error"
              role="alert"
              className="px-4 pt-2 text-[15px] leading-snug text-[color-mix(in_oklch,var(--destructive)_70%,var(--tier-ink))]"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={isLoading} className={`${primaryButton} mt-6`}>
            {isLoading && (
              <span
                aria-hidden
                className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
              />
            )}
            {isLoading ? "Creating your account…" : "Create account"}
          </button>
          <p role="status" className="sr-only">
            {isLoading ? "Creating your account" : ""}
          </p>

          <p className="mt-4 px-2 text-center text-[13px] leading-snug text-pretty text-[var(--label-tertiary)]">
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

      <p className="mx-auto mt-auto flex w-full max-w-[22.5rem] flex-wrap items-center justify-center gap-x-1 pt-10 text-[15px] text-[var(--label-secondary)] sm:mt-8 sm:pt-0">
        Already have an account?
        <Link href="/login" className={`${quietLink} font-medium`}>
          Sign in
        </Link>
      </p>
    </main>
  );
}

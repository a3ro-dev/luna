"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    setTokenValid(true);
  }, [token]);

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
      <div className="min-h-screen bg-[#FFF9F9] flex flex-col items-center justify-center font-sans p-4 selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
        <div className="w-full max-w-md">
          <div className="rounded-[2.5rem] border border-white/60 bg-white/50 p-10 shadow-[0_30px_60px_rgba(255,181,192,0.1)] backdrop-blur-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-[#FFB5C0]/10 flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFB5C0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-3">
              Invalid or missing token
            </h2>
            <p className="text-sm font-light text-[#8E7D82] mb-6">
              This reset link is invalid or has expired. Please request a new
              one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#6D5A60] px-8 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition duration-300 hover:bg-[#8E7D82]"
            >
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FFF9F9] flex flex-col items-center justify-center font-sans p-4 selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
        <div className="w-full max-w-md">
          <div className="rounded-[2.5rem] border border-white/60 bg-white/50 p-10 shadow-[0_30px_60px_rgba(255,181,192,0.1)] backdrop-blur-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-[#D6CBE3]/30 flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
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
            <h2 className="font-serif text-2xl font-light text-[#6D5A60] mb-3">
              Password reset!
            </h2>
            <p className="text-sm font-light text-[#8E7D82]">
              Your password has been updated. Redirecting you to sign in...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F9] flex flex-col items-center justify-center font-sans p-4 selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
      <div className="w-full max-w-md">
        <div className="rounded-[2.5rem] border border-white/60 bg-white/50 p-10 shadow-[0_30px_60px_rgba(255,181,192,0.1)] backdrop-blur-2xl">
          <div className="text-center mb-10">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 font-serif text-4xl font-light text-[#6D5A60]"
            >
              <img src="/luna.png" alt="" className="h-10 w-10 rounded-full" />
              Luna
            </Link>
            <p className="mt-3 text-sm font-light text-[#8E7D82]">
              Set your new password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-2xl bg-[#FFB5C0]/10 px-4 py-3 text-sm text-[#FFB5C0] text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all placeholder:text-[#8E7D82]/40"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all placeholder:text-[#8E7D82]/40"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 h-14 rounded-2xl bg-[#6D5A60] text-[11px] font-semibold uppercase tracking-widest text-white shadow-[0_16px_32px_rgba(109,90,96,0.2)] transition duration-300 hover:bg-[#8E7D82] hover:shadow-[0_20px_40px_rgba(109,90,96,0.3)] disabled:opacity-60 flex justify-center items-center"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Reset password"
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm font-light text-[#8E7D82]">
          Remember your password?{" "}
          <Link
            href="/login"
            className="text-[#FFB5C0] hover:text-[#6D5A60] transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPageClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF9F9] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#FFB5C0]/30 border-t-[#FFB5C0] rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

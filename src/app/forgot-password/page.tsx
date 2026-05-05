"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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
    <div className="min-h-screen bg-[#FFF9F9] flex flex-col items-center justify-center font-sans p-4 selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
      <div className="w-full max-w-md">
        <div className="rounded-[2.5rem] border border-white/60 bg-white/50 p-10 shadow-[0_30px_60px_rgba(255,181,192,0.1)] backdrop-blur-2xl">
          <div className="text-center mb-10">
            <Link
              href="/"
              className="font-serif text-4xl font-light text-[#6D5A60]"
            >
              Luna
            </Link>
            <p className="mt-3 text-sm font-light text-[#8E7D82]">
              Reset your password
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FFDDE0]/40 flex items-center justify-center mx-auto">
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
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl font-light text-[#6D5A60]">
                Check your inbox
              </h2>
              <p className="text-sm font-light text-[#8E7D82] leading-relaxed">
                If an account exists for <strong className="text-[#6D5A60]">{email}</strong>, you&apos;ll receive a password reset link shortly. The link expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#6D5A60] px-8 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_12px_24px_rgba(109,90,96,0.2)] transition duration-300 hover:bg-[#8E7D82] mt-4"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-2xl bg-[#FFB5C0]/10 px-4 py-3 text-sm text-[#FFB5C0] text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all placeholder:text-[#8E7D82]/40"
                  placeholder="you@example.com"
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
                  "Send reset link"
                )}
              </button>
            </form>
          )}
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

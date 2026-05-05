"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError("Invalid email or password.");
      setIsLoading(false);
    } else {
      // Send login notification (non-blocking)
      fetch("/api/auth/login-notification", { method: "POST" }).catch(() => {});
      router.push("/dashboard");
      router.refresh();
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
              Sign in to your cycle tracker
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

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8E7D82] mb-2 ml-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-3.5 rounded-2xl bg-[#FFF9F9] border border-[#FFDDE0]/40 text-[#6D5A60] font-light focus:outline-none focus:ring-2 focus:ring-[#FFB5C0]/30 focus:border-[#FFB5C0]/50 transition-all placeholder:text-[#8E7D82]/40"
                placeholder="••••••••"
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
                "Sign In"
              )}
            </button>

            <div className="mt-4 text-center">
              <Link
                href="/forgot-password"
                className="text-[12px] font-light text-[#8E7D82] hover:text-[#FFB5C0] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </div>

        <p className="mt-8 text-center text-sm font-light text-[#8E7D82]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-[#FFB5C0] hover:text-[#6D5A60] transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client"

import React, { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError("Invalid email or password.")
      setIsLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFBFB] flex flex-col items-center justify-center font-sans p-4 selection:bg-[#F7C4C8] selection:text-white">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-[#F7C4C8]/20">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-[#5A4A4D] mb-2">Luna</h1>
          <p className="text-[#7A6A6D] opacity-70">Sign in to your cycle tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-[#F4A6A6]/10 text-[#F4A6A6] p-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-[#7A6A6D] mb-1.5 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[#FCFBFB] border border-[#F7C4C8]/30 text-[#5A4A4D] focus:outline-none focus:ring-2 focus:ring-[#F7C4C8]/50 focus:border-[#F7C4C8] transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#7A6A6D] mb-1.5 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[#FCFBFB] border border-[#F7C4C8]/30 text-[#5A4A4D] focus:outline-none focus:ring-2 focus:ring-[#F7C4C8]/50 focus:border-[#F7C4C8] transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#F7C4C8] hover:bg-[#F4A6A6] text-white py-3.5 rounded-xl font-medium transition-colors mt-2 disabled:opacity-70 flex justify-center items-center"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

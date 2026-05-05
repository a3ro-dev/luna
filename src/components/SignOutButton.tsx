"use client"

import { signOut } from "next-auth/react"

type SignOutButtonProps = {
  className?: string
}

export default function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className}
    >
      Sign out
    </button>
  )
}

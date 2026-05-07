"use client";

import React, { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onOpenSessions: () => void;
}

export const ChatHeader = memo(function ChatHeader({
  onOpenSessions,
}: ChatHeaderProps) {
  const { status: authStatus } = useSession();

  return (
    <header className="py-2 px-4 md:py-3 md:px-6 border-b border-[#FFDDE0]/30 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="mx-auto max-w-3xl flex items-center justify-between gap-2">
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <h1 className="flex items-center gap-1.5 font-serif text-xl md:text-2xl font-light text-[#6D5A60]">
            <Image
              src="/luna.png"
              alt=""
              width={28}
              height={28}
              className="h-6 w-6 md:h-7 md:w-7 rounded-full"
            />
            Luna
          </h1>
          <span className="text-xs font-light text-[#8E7D82] hidden sm:inline">
            Your caring health companion
          </span>
        </div>

        {/* Mobile: icon-only nav */}
        <div className="flex items-center gap-1 rounded-full border border-[#FFDDE0]/50 bg-white/70 px-1 py-0.5 md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenSessions}
            className="size-9 text-[#8E7D82] hover:text-[#6D5A60] hover:bg-[#FFF5F7] cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </Button>
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-9 text-[#8E7D82] hover:text-[#6D5A60] hover:bg-[#FFF5F7] cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </Button>
          </Link>
          <Link href="/settings">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-9 text-[#8E7D82] hover:text-[#6D5A60] hover:bg-[#FFF5F7] cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Button>
          </Link>
        </div>

        {/* Desktop: text nav */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-[#6D5A60] border-[#FFDDE0]/60 rounded-full hover:bg-[#FFF5F7] cursor-pointer"
            >
              Dashboard
            </Button>
          </Link>
          <Link href="/settings">
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-[#6D5A60] border-[#FFDDE0]/60 rounded-full hover:bg-[#FFF5F7] cursor-pointer"
            >
              Settings
            </Button>
          </Link>
          {authStatus === "authenticated" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-[#6D5A60] border-[#FFDDE0]/60 rounded-full hover:bg-[#FFF5F7] cursor-pointer"
            >
              Sign out
            </Button>
          ) : (
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-[#6D5A60] border-[#FFDDE0]/60 rounded-full hover:bg-[#FFF5F7] cursor-pointer"
              >
                Log in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
});

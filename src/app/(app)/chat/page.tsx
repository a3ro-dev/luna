"use client"

import React, { useRef, useState, useEffect } from "react"
import { useChat } from "@ai-sdk/react"

type ChatSession = {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

export default function ChatPage() {
  const { messages, sendMessage, status, setMessages } = useChat({
    api: "/api/chat"
  })

  const isBusy = status === "streaming" || status === "submitted"

  const [input, setInput] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [totalImagesInContext, setTotalImagesInContext] = useState(0)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadSessions = async () => {
    const res = await fetch("/api/chat/sessions")
    if (!res.ok) return []
    return (await res.json()) as ChatSession[]
  }

  const loadSessionMessages = async (sessionId: string) => {
    const res = await fetch(`/api/chat/sessions/${sessionId}/messages`)
    if (!res.ok) return []
    return await res.json()
  }

  const createSession = async () => {
    const res = await fetch("/api/chat/sessions", { method: "POST" })
    if (!res.ok) return null
    return (await res.json()) as ChatSession
  }

  const renameSession = async (sessionId: string) => {
    const res = await fetch(`/api/chat/sessions/${sessionId}/rename`, {
      method: "POST",
    })
    if (!res.ok) return null
    return (await res.json()) as ChatSession
  }

  const deleteSession = async (sessionId: string) => {
    const res = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
    })
    return res.ok
  }

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoadingSessions(true)
      const loadedSessions = await loadSessions()
      let nextSessions = loadedSessions
      if (loadedSessions.length === 0) {
        const created = await createSession()
        nextSessions = created ? [created] : []
      }
      setSessions(nextSessions)
      if (nextSessions.length > 0) {
        setActiveSessionId(nextSessions[0].id)
        const initialMessages = await loadSessionMessages(nextSessions[0].id)
        setMessages(initialMessages)
      }
      setIsLoadingSessions(false)
    }

    bootstrap()
  }, [setMessages])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      const allowed = newFiles.slice(0, 4 - images.length)
      setImages(prev => [...prev, ...allowed])
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result === "string") {
          const base64 = result.split(",")[1] || ""
          resolve(base64)
        } else {
          reject(new Error("Failed to read file"))
        }
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedInput = input.trim()
    if (trimmedInput.length === 0 && images.length === 0) {
      return
    }
    let sessionId = activeSessionId
    if (!sessionId) {
      const created = await createSession()
      if (!created) return
      setSessions((prev) => [created, ...prev])
      setActiveSessionId(created.id)
      setMessages([])
      sessionId = created.id
    }
    if (totalImagesInContext + images.length > 10) {
      alert("Maximum 10 images allowed per conversation context.")
      return
    }
    setTotalImagesInContext(prev => prev + images.length)

    const imageParts = await Promise.all(
      images.map(async (file) => ({
        type: "file" as const,
        mediaType: file.type || "application/octet-stream",
        data: await readFileAsBase64(file),
        filename: file.name,
      }))
    )

    const parts = [
      ...imageParts,
      ...(trimmedInput.length > 0
        ? [{ type: "text" as const, text: trimmedInput }]
        : [])
    ]

    sendMessage(
      {
        role: "user",
        parts,
      },
      {
        body: {
          sessionId,
        }
      }
    )
    setInput("")
    setImages([])
  }

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === activeSessionId) return
    setActiveSessionId(sessionId)
    setMessages([])
    const sessionMessages = await loadSessionMessages(sessionId)
    setMessages(sessionMessages)
  }

  const handleNewSession = async () => {
    const created = await createSession()
    if (!created) return
    setSessions((prev) => [created, ...prev])
    setActiveSessionId(created.id)
    setMessages([])
  }

  const handleRenameSession = async (sessionId: string) => {
    const updated = await renameSession(sessionId)
    if (!updated) return
    setSessions((prev) =>
      prev.map((session) => (session.id === updated.id ? updated : session))
    )
  }

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm("Delete this chat? This cannot be undone.")
    if (!confirmed) return
    const ok = await deleteSession(sessionId)
    if (!ok) return

    let nextActiveId: string | null = null
    setSessions((prev) => {
      const remaining = prev.filter((session) => session.id !== sessionId)
      if (activeSessionId === sessionId) {
        nextActiveId = remaining[0]?.id ?? null
      }
      return remaining
    })

    if (activeSessionId === sessionId) {
      if (nextActiveId) {
        setActiveSessionId(nextActiveId)
        const nextMessages = await loadSessionMessages(nextActiveId)
        setMessages(nextMessages)
      } else {
        setActiveSessionId(null)
        setMessages([])
      }
    }
  }

  const isStreaming = status === "streaming"
  const hasOpenUiTags = (value: string) => /<\/?(Card|Chart|Table|Progress|StatGroup|Badge|Row|Column)\b/.test(value)

  return (
    <div className="min-h-screen bg-[#FFF9F9] flex font-sans selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
      <aside className="w-[240px] shrink-0 border-r border-[#FFDDE0]/40 bg-white/60 backdrop-blur-xl px-4 py-6 hidden md:flex md:flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-base text-[#6D5A60]">Chats</h2>
          <button
            type="button"
            onClick={handleNewSession}
            className="text-xs text-[#8E7D82] hover:text-[#6D5A60] transition-colors"
          >
            New
          </button>
        </div>
        <div className="space-y-2 overflow-y-auto">
          {isLoadingSessions && (
            <div className="text-xs text-[#8E7D82]/60">Loading...</div>
          )}
          {!isLoadingSessions && sessions.length === 0 && (
            <div className="text-xs text-[#8E7D82]/60">No chats yet</div>
          )}
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId
            return (
              <div
                key={session.id}
                className={`w-full rounded-xl px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-[#FFEEF1] text-[#6D5A60]"
                    : "text-[#8E7D82] hover:bg-[#FFF5F7]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectSession(session.id)}
                  className="w-full text-left"
                >
                  {session.title || "Untitled chat"}
                </button>
                <div className="flex items-center justify-end gap-2 mt-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleRenameSession(session.id)}
                    className="text-[#8E7D82] hover:text-[#6D5A60]"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(session.id)}
                    className="text-[#B08C92] hover:text-[#6D5A60]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="py-5 px-6 md:px-10 border-b border-[#FFDDE0]/30 bg-white/50 backdrop-blur-xl sticky top-0 z-10">
          <h1 className="font-serif text-2xl font-light text-[#6D5A60]">Luna</h1>
          <p className="text-xs font-light text-[#8E7D82]">Your caring health companion</p>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-5 opacity-70 mt-24">
            <div className="w-14 h-14 rounded-full bg-[#FFB5C0] flex items-center justify-center text-white text-xl shadow-[0_10px_20px_rgba(255,181,192,0.2)]">
              ✨
            </div>
            <p className="text-[#8E7D82] max-w-md font-light leading-relaxed">
              Hi lovely, I&apos;m Luna. You can log your cycle, ask about symptoms, or just chat about how you&apos;re feeling today.
            </p>
          </div>
        )}

        {messages.map(m => {
          const textParts = Array.isArray(m.parts)
            ? m.parts.filter((part) => part.type === "text")
            : []
          const messageText = textParts
            .map((part) => part.text)
            .join("") || (typeof m.content === "string" ? m.content : "")
          const fallbackText = isStreaming && m.role === "assistant" ? "..." : ""

          return (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] md:max-w-[60%] rounded-[1.5rem] p-5 ${
                m.role === 'user'
                  ? 'bg-[#6D5A60] text-white rounded-tr-lg shadow-[0_8px_16px_rgba(109,90,96,0.15)]'
                  : 'bg-white/80 text-[#6D5A60] rounded-tl-lg border border-[#FFDDE0]/30 shadow-[0_8px_20px_rgba(255,181,192,0.06)] backdrop-blur-xl'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed font-light">{messageText || fallbackText}</p>
            </div>
          </div>
          )
        })}
        {isBusy && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-white/80 text-[#6D5A60] rounded-[1.5rem] p-5 rounded-tl-lg border border-[#FFDDE0]/30 shadow-sm flex space-x-2 items-center backdrop-blur-xl">
              <span className="w-2 h-2 rounded-full bg-[#FFB5C0] animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-[#FFB5C0] animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-2 h-2 rounded-full bg-[#FFB5C0] animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </main>

        <div className="p-5 bg-white/60 border-t border-[#FFDDE0]/20 backdrop-blur-xl">
          <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
          {images.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {images.map((file, i) => (
                <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#FFDDE0]/40 shrink-0">
                  <img src={URL.createObjectURL(file)} alt="upload" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-black/40 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">×</button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-center bg-[#FFF9F9] border border-[#FFDDE0]/30 rounded-full shadow-[0_4px_12px_rgba(255,181,192,0.06)] focus-within:ring-2 focus-within:ring-[#FFB5C0]/30 focus-within:border-[#FFB5C0]/50 transition-all">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={images.length >= 4 || totalImagesInContext >= 10} className="p-3 ml-2 text-[#8E7D82] hover:text-[#FFB5C0] transition-colors disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </button>
            <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <input
              className="flex-1 bg-transparent border-none py-4 px-2 text-[#6D5A60] font-light placeholder:text-[#8E7D82]/40 focus:outline-none focus:ring-0"
              value={input}
              placeholder="How are you feeling today?"
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={isBusy || (input.trim().length === 0 && images.length === 0)} className="mr-2 bg-[#6D5A60] hover:bg-[#8E7D82] text-white p-2.5 rounded-full transition-colors disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
          <div className="flex justify-between items-center mt-2 px-4">
            <span className="text-[10px] text-[#8E7D82]/50">{totalImagesInContext}/10 images this session</span>
            <span className="text-[10px] text-[#8E7D82]/30">Luna can make mistakes. Verify important info.</span>
          </div>
          </form>
        </div>
      </div>
    </div>
  )
}

"use client"

import React, { useRef, useState, useEffect } from "react"
import { useChat } from "ai/react"

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat"
  })

  const [images, setImages] = useState<File[]>([])
  const [totalImagesInContext, setTotalImagesInContext] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      // Enforce max 4 per message
      const allowed = newFiles.slice(0, 4 - images.length)
      setImages(prev => [...prev, ...allowed])
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Check total context window images
    if (totalImagesInContext + images.length > 10) {
      alert("Maximum 10 images allowed per conversation context.")
      return
    }
    
    setTotalImagesInContext(prev => prev + images.length)
    
    // In a real implementation with ai/react, we would upload these images or convert to base64
    // Here we submit the text and clear images for simplicity of the UI demonstration
    handleSubmit(e)
    setImages([])
  }

  return (
    <div className="min-h-screen bg-[#FCFBFB] flex flex-col font-sans selection:bg-[#F7C4C8] selection:text-white">
      {/* Header */}
      <header className="py-6 px-8 border-b border-[#F7C4C8]/20 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <h1 className="font-serif text-3xl text-[#5A4A4D]">Luna</h1>
        <p className="text-[#7A6A6D] opacity-70 text-sm">Your caring health companion</p>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60 mt-20">
            <div className="w-16 h-16 rounded-full bg-[#F7C4C8] flex items-center justify-center text-white text-2xl shadow-sm">
              ✨
            </div>
            <p className="text-[#7A6A6D] max-w-md">
              Hi lovely, I'm Luna. You can log your cycle, ask about symptoms, or just chat about how you're feeling today.
            </p>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] md:max-w-[60%] rounded-2xl p-5 ${
                m.role === 'user' 
                  ? 'bg-[#F7C4C8] text-white rounded-tr-sm shadow-sm' 
                  : 'bg-white text-[#5A4A4D] rounded-tl-sm border border-[#F7C4C8]/20 shadow-[0_4px_20px_rgb(0,0,0,0.02)]'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white text-[#5A4A4D] rounded-2xl p-5 rounded-tl-sm border border-[#F7C4C8]/20 shadow-sm flex space-x-2 items-center">
                <span className="w-2 h-2 rounded-full bg-[#F7C4C8] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#F7C4C8] animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 rounded-full bg-[#F7C4C8] animate-bounce" style={{ animationDelay: '0.4s' }}></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-[#F7C4C8]/20">
        <form onSubmit={onSubmit} className="max-w-4xl mx-auto">
          {/* Image Previews */}
          {images.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {images.map((file, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#F7C4C8]/40 shrink-0">
                  <img src={URL.createObjectURL(file)} alt="upload" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-center bg-[#FCFBFB] border border-[#F7C4C8]/30 rounded-full shadow-sm focus-within:ring-2 focus-within:ring-[#F7C4C8]/50 focus-within:border-[#F7C4C8] transition-all">
            {/* Image Upload Button */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 ml-2 text-[#7A6A6D] hover:text-[#F4A6A6] transition-colors disabled:opacity-50"
              disabled={images.length >= 4 || totalImagesInContext >= 10}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </button>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <input
              className="flex-1 bg-transparent border-none py-4 px-2 text-[#5A4A4D] placeholder:text-[#7A6A6D]/50 focus:outline-none focus:ring-0"
              value={input}
              placeholder="How are you feeling today?"
              onChange={handleInputChange}
            />

            <button 
              type="submit" 
              disabled={isLoading || (!input.trim() && images.length === 0)}
              className="mr-2 bg-[#F7C4C8] hover:bg-[#F4A6A6] text-white p-2.5 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-[#F7C4C8]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z"/>
                <path d="M22 2 11 13"/>
              </svg>
            </button>
          </div>

          {/* Subtext Counter */}
          <div className="flex justify-between items-center mt-2 px-4">
            <span className="text-[11px] text-[#7A6A6D]/60 flex items-center">
              {totalImagesInContext}/10 images used in this session
            </span>
            <span className="text-[11px] text-[#7A6A6D]/40">
              Luna can make mistakes. Consider verifying important information.
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}

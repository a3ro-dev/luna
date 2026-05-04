import React from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  // Placeholder static data for UI demonstration
  const predictedNextPeriod = "October 14th, 2026"
  const predictedOvulation = "September 30th, 2026"
  
  return (
    <div className="min-h-screen bg-[#FCFBFB] text-[#7A6A6D] font-sans p-6 md:p-12 selection:bg-[#F7C4C8] selection:text-white">
      <header className="mb-12">
        <h1 className="font-serif text-5xl text-[#5A4A4D] mb-2 tracking-tight">
          Welcome back, {session.user.name || session.user.email?.split("@")[0] || "lovely"}
        </h1>
        <p className="text-lg opacity-80">Here is your cycle overview for the coming weeks.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {/* Prediction Cards */}
        <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-[#F7C4C8]/20 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)]">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-2 text-[#F4A6A6]">Next Period</h3>
          <p className="font-serif text-4xl text-[#5A4A4D]">{predictedNextPeriod}</p>
          <p className="text-sm opacity-60 mt-2">In about 12 days</p>
        </div>
        
        <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-[#F7C4C8]/20 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)]">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-2 text-[#EBCB8B]">Estimated Ovulation</h3>
          <p className="font-serif text-4xl text-[#5A4A4D]">{predictedOvulation}</p>
          <p className="text-sm opacity-60 mt-2">High chance of conception</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-[#F7C4C8]/20 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] flex items-center justify-center flex-col">
          <p className="font-serif text-xl text-[#5A4A4D] text-center mb-4">Have questions about your cycle?</p>
          <a href="/chat" className="bg-[#F7C4C8] text-white px-6 py-3 rounded-full hover:bg-[#F4A6A6] transition-colors font-medium">
            Ask Luna
          </a>
        </div>
      </div>

      <section className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-[#F7C4C8]/20">
        <h2 className="font-serif text-3xl text-[#5A4A4D] mb-6">Calendar</h2>
        <div className="grid grid-cols-7 gap-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-xs font-bold uppercase text-[#7A6A6D]/50 mb-2">{day}</div>
          ))}
          {/* Mock Calendar Grid */}
          {Array.from({ length: 35 }).map((_, i) => {
            const day = i - 2; // Offset for demo
            let phaseColor = "hover:bg-[#F7C4C8]/10";
            let textColor = "text-[#7A6A6D]";
            let style = {};

            if (day > 0 && day <= 5) {
              // Menstrual
              phaseColor = "bg-[#F4A6A6]";
              textColor = "text-white";
            } else if (day > 5 && day <= 12) {
              // Follicular
              phaseColor = "bg-[#A3BCA9]/20";
            } else if (day > 12 && day <= 16) {
              // Ovulatory
              phaseColor = "bg-[#EBCB8B]/40";
            } else if (day > 16 && day <= 28) {
              // Luteal
              phaseColor = "bg-[#B4A6C4]/20";
            } else if (day > 28 && day <= 32) {
              // Predicted Menstrual (dashed/lighter)
              phaseColor = "bg-transparent border border-dashed border-[#F4A6A6]";
              textColor = "text-[#F4A6A6]";
              style = { opacity: 0.7 };
            }

            return (
              <div 
                key={i} 
                style={style}
                className={`h-12 md:h-20 rounded-xl flex items-center justify-center text-sm md:text-lg transition-colors cursor-pointer ${day > 0 && day <= 31 ? phaseColor : 'text-transparent pointer-events-none'} ${textColor}`}
              >
                {day > 0 && day <= 31 ? day : ''}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  )
}

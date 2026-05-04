"use client"

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useRef } from "react";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for Jakub's production polish
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  // 3D rotation transforms (Jhey's playful experimentation)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);
  const shadowX = useTransform(mouseXSpring, [-0.5, 0.5], ["20px", "-20px"]);
  const shadowY = useTransform(mouseYSpring, [-0.5, 0.5], ["20px", "-20px"]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Normalize to -0.5 to 0.5
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FCFBFB] font-sans selection:bg-[#F7C4C8] selection:text-white overflow-hidden relative">
      
      {/* Soft Ambient Background Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#F7C4C8] to-[#FCFBFB] opacity-40 blur-[120px] pointer-events-none"
      />
      
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          rotate: [0, -90, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-[#F4A6A6] to-[#B4A6C4] opacity-30 blur-[150px] pointer-events-none"
      />

      <main 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="flex flex-1 flex-col items-center justify-center p-8 md:p-24 text-center z-10 perspective-[1000px]"
      >
        
        <motion.div
          initial={{ opacity: 0, translateY: 30, filter: "blur(10px)" }}
          animate={{ opacity: 1, translateY: 0, filter: "blur(0px)" }}
          transition={{ type: "spring", duration: 0.8, bounce: 0, delay: 0.1 }}
          style={{ 
            rotateX, 
            rotateY, 
            transformStyle: "preserve-3d" 
          }}
          className="relative flex flex-col items-center justify-center bg-white/40 backdrop-blur-xl border border-white/60 p-12 md:p-20 rounded-[3rem] shadow-[0_8px_32px_rgba(247,196,200,0.2)]"
        >
          {/* Dynamic soft shadow that moves opposite to tilt */}
          <motion.div 
            className="absolute inset-0 bg-[#F7C4C8]/20 rounded-[3rem] blur-2xl -z-10"
            style={{ x: shadowX, y: shadowY }}
          />

          <motion.div 
            style={{ translateZ: "50px" }}
            className="relative w-28 h-28 mb-10 group cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-tr from-[#F7C4C8] via-[#F4A6A6] to-[#EBCB8B] rounded-full opacity-30 blur-xl"
            />
            <div className="absolute inset-0 flex items-center justify-center text-5xl shadow-inner rounded-full bg-gradient-to-b from-white to-[#FCFBFB] border border-[#F7C4C8]/40 transition-transform duration-500 group-hover:rotate-12">
              ✨
            </div>
          </motion.div>

          <motion.h1 
            style={{ translateZ: "80px" }}
            className="font-serif text-7xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-br from-[#5A4A4D] to-[#7A6A6D] mb-6 tracking-tight drop-shadow-sm"
          >
            Luna
          </motion.h1>
          
          <motion.p 
            style={{ translateZ: "40px" }}
            className="max-w-md text-xl leading-relaxed text-[#7A6A6D] opacity-90 mb-12 font-medium"
          >
            Your magical, intelligent cycle tracker. Minimal, private, and beautifully yours.
          </motion.p>

          <motion.div 
            style={{ translateZ: "60px" }}
            className="flex flex-col gap-4 w-full sm:w-auto sm:flex-row"
          >
            <Link href="/login" passHref legacyBehavior>
              <motion.a
                whileHover={{ scale: 1.03, translateY: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F7C4C8] to-[#F4A6A6] px-10 font-bold text-white shadow-lg shadow-[#F7C4C8]/40 transition-all sm:w-auto overflow-hidden relative group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] skew-x-[-15deg] group-hover:animate-[shine_1s_ease-out]"></div>
                Get Started
              </motion.a>
            </Link>
            
            <Link href="/dashboard" passHref legacyBehavior>
              <motion.a
                whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.8)" }}
                whileTap={{ scale: 0.97 }}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-full border-2 border-[#F7C4C8]/30 bg-white/50 px-10 font-bold text-[#5A4A4D] shadow-sm transition-colors sm:w-auto backdrop-blur-md"
              >
                Dashboard
              </motion.a>
            </Link>
          </motion.div>
        </motion.div>

      </main>

      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="py-8 text-center text-sm font-medium text-[#7A6A6D] opacity-60 z-10"
      >
        <p>© {new Date().getFullYear()} Luna. Designed with magic & motion.</p>
      </motion.footer>

      {/* Shine animation for button */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shine {
          100% { translate: 200% 0; }
        }
      `}} />
    </div>
  );
}

"use client"

import React, { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Calendar, Heart, Moon, Sparkles } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export default function Home() {
  const container = useRef<HTMLDivElement>(null);
  
  // Hero Refs
  const heroRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);

  // Feature Refs
  const featuresContainerRef = useRef<HTMLDivElement>(null);
  
  // Narrative Refs
  const narrativeContainerRef = useRef<HTMLDivElement>(null);
  const narrativeText1Ref = useRef<HTMLDivElement>(null);
  const narrativeText2Ref = useRef<HTMLDivElement>(null);
  const narrativeText3Ref = useRef<HTMLDivElement>(null);
  
  // Parallax & CTA
  const parallaxRef = useRef<HTMLDivElement>(null);
  const parallaxBgRef = useRef<HTMLDivElement>(null);
  const ctaBtnRef = useRef<HTMLAnchorElement>(null);

  useGSAP(() => {
    // Media Query for prefers-reduced-motion
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      
      // 1. HERO SECTION
      // Fade in text on load
      gsap.from(heroTextRef.current, {
        opacity: 0,
        y: 40,
        duration: 1.5,
        ease: "power2.out"
      });

      // Pin hero text & scale background on scroll
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "+=100%",
          scrub: true,
          pin: true,
        }
      });
      heroTl.to(heroBgRef.current, {
        scale: 1.15,
        opacity: 0.1,
        ease: "none"
      }).to(heroTextRef.current, {
        opacity: 0,
        y: -30,
        ease: "none"
      }, 0);

      // 2. FEATURE REVEAL
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: featuresContainerRef.current,
          start: "top 80%",
          once: true,
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out"
      });

      // 3. STICKY SCROLL NARRATIVE
      const narrativeTl = gsap.timeline({
        scrollTrigger: {
          trigger: narrativeContainerRef.current,
          start: "top top",
          end: "+=300%", // 3 steps
          scrub: true,
          pin: true,
        }
      });

      // Step 1 -> 2
      narrativeTl.to(narrativeText1Ref.current, { opacity: 0, y: -20, duration: 1 })
                 .fromTo(narrativeText2Ref.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, "<0.5")
      // Step 2 -> 3
                 .to(narrativeText2Ref.current, { opacity: 0, y: -20, duration: 1 })
                 .fromTo(narrativeText3Ref.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, "<0.5");

      // CANVAS IMAGE SEQUENCE SCRUBBING
      const canvas = document.querySelector("#video-canvas") as HTMLCanvasElement;
      if (canvas) {
        const context = canvas.getContext("2d");
        const FRAME_COUNT = 428; 
        const currentFrame = (index: number) => `/frames/frame_${(index + 1).toString().padStart(4, '0')}.jpg`;
        const images: HTMLImageElement[] = [];
        const frames = { frame: 0 };

        // Preload images
        for (let i = 0; i < FRAME_COUNT; i++) {
          const img = new Image();
          img.src = currentFrame(i);
          images.push(img);
        }

        const render = () => {
          if (images[frames.frame] && context) {
            // Draw image covering the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            const img = images[frames.frame];
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            context.drawImage(img, x, y, img.width * scale, img.height * scale);
          }
        };

        images[0].onload = render;

        gsap.to(frames, {
          frame: FRAME_COUNT - 1,
          snap: "frame",
          ease: "none",
          scrollTrigger: {
            trigger: narrativeContainerRef.current,
            start: "top top",
            end: "+=300%",
            scrub: 0.5,
          },
          onUpdate: render,
        });
      }

      // 4. PARALLAX MEDIA
      gsap.to(parallaxBgRef.current, {
        scrollTrigger: {
          trigger: parallaxRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
        y: "15%", 
        ease: "none"
      });

      // 5. CTA SECTION
      gsap.from(ctaBtnRef.current, {
        scrollTrigger: {
          trigger: ctaBtnRef.current,
          start: "top 90%",
          once: true,
        },
        scale: 0.9,
        opacity: 0,
        duration: 0.8,
        ease: "back.out(1.2)"
      });
      
    });

    return () => mm.revert();
  }, { scope: container });

  return (
    <div ref={container} className="bg-[#0F0A0A] font-sans selection:bg-[#F7C4C8]/30 selection:text-[#FFF5F5] overflow-x-hidden">
      
      {/* Soft Bloom Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(247,196,200,0.06)_0%,transparent_70%)] blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(180,166,196,0.05)_0%,transparent_70%)] blur-[120px]" />
      </div>

      {/* 1. HERO SECTION */}
      <section ref={heroRef} className="relative h-screen w-full flex flex-col items-center justify-center z-10">
        <div 
          ref={heroBgRef} 
          className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,245,245,0.03)_0%,transparent_100%)] -z-10 will-change-transform"
        />
        
        <div ref={heroTextRef} className="text-center px-4 will-change-transform">
          <h1 className="font-serif text-7xl md:text-9xl text-[#FFF5F5] mb-6 tracking-wide drop-shadow-[0_10px_40px_rgba(255,245,245,0.15)]">
            Luna
          </h1>
          <p className="text-xl md:text-2xl text-[#E5D5D5] opacity-80 max-w-lg mx-auto font-light leading-relaxed">
            Your intelligent cycle tracker. Designed for peace of mind, built with breathtaking precision.
          </p>
        </div>
      </section>

      {/* 2. FEATURE REVEAL */}
      <section ref={featuresContainerRef} className="py-32 px-6 md:px-24 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-24">
          <h2 className="font-serif text-4xl text-[#FFF5F5] mb-6">Intelligently soft</h2>
          <p className="text-[#E5D5D5] opacity-70 max-w-md mx-auto font-light">Everything you need, nothing you don't. Deeply personal, deeply private.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-10">
          {[
            { title: "Cycle Predictions", desc: "Adaptive algorithms learn your unique rhythm.", icon: <Calendar className="text-[#F7C4C8] w-7 h-7" /> },
            { title: "Symptom Tracking", desc: "Log moods and symptoms naturally via chat.", icon: <Heart className="text-[#F7C4C8] w-7 h-7" /> },
            { title: "Luna AI", desc: "A supportive companion available 24/7.", icon: <Sparkles className="text-[#F7C4C8] w-7 h-7" /> }
          ].map((feature, i) => (
            <div key={i} className="feature-card will-change-transform bg-white/[0.03] backdrop-blur-2xl p-10 rounded-[2rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_20px_rgba(247,196,200,0.02)] flex flex-col items-start text-left transition-colors hover:bg-white/[0.05] hover:border-white/10">
              <div className="bg-[#F7C4C8]/10 p-5 rounded-2xl mb-8 shadow-inner shadow-white/5">
                {feature.icon}
              </div>
              <h3 className="font-serif text-2xl text-[#FFF5F5] mb-4 tracking-wide">{feature.title}</h3>
              <p className="text-[#E5D5D5] opacity-60 leading-relaxed font-light">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. STICKY SCROLL NARRATIVE */}
      <section ref={narrativeContainerRef} className="h-screen w-full relative flex items-center overflow-hidden z-10">
        
        {/* Left Side: Video Canvas Frame */}
        <div className="w-1/2 h-full flex items-center justify-center p-12">
          <div className="w-full max-w-md aspect-[9/16] bg-black/40 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(247,196,200,0.05)] border border-white/10 relative overflow-hidden flex items-center justify-center">
             <canvas id="video-canvas" width="1080" height="1920" className="absolute w-full h-full object-cover opacity-90" />
             {/* subtle vignette over video */}
             <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] pointer-events-none" />
          </div>
        </div>

        {/* Right Side: Swapping Text */}
        <div className="w-1/2 h-full relative flex flex-col justify-center px-12 md:px-24">
          <div ref={narrativeText1Ref} className="absolute w-full max-w-md pr-12 will-change-transform">
            <Moon className="w-12 h-12 text-[#B4A6C4] mb-8 drop-shadow-[0_0_15px_rgba(180,166,196,0.3)]" />
            <h2 className="font-serif text-5xl md:text-6xl text-[#FFF5F5] mb-6 leading-[1.1] tracking-wide">Understand your phases.</h2>
            <p className="text-xl text-[#E5D5D5] opacity-70 font-light leading-relaxed">Luna guides you through the menstrual, follicular, ovulatory, and luteal phases with gentle insights.</p>
          </div>
          
          <div ref={narrativeText2Ref} className="absolute w-full max-w-md pr-12 opacity-0 will-change-transform">
            <Heart className="w-12 h-12 text-[#F7C4C8] mb-8 drop-shadow-[0_0_15px_rgba(247,196,200,0.3)]" />
            <h2 className="font-serif text-5xl md:text-6xl text-[#FFF5F5] mb-6 leading-[1.1] tracking-wide">Listen to your body.</h2>
            <p className="text-xl text-[#E5D5D5] opacity-70 font-light leading-relaxed">Track cramps, mood swings, and energy levels seamlessly through natural conversation.</p>
          </div>

          <div ref={narrativeText3Ref} className="absolute w-full max-w-md pr-12 opacity-0 will-change-transform">
            <Sparkles className="w-12 h-12 text-[#EBCB8B] mb-8 drop-shadow-[0_0_15px_rgba(235,203,139,0.3)]" />
            <h2 className="font-serif text-5xl md:text-6xl text-[#FFF5F5] mb-6 leading-[1.1] tracking-wide">Grok the pattern.</h2>
            <p className="text-xl text-[#E5D5D5] opacity-70 font-light leading-relaxed">Powered by xAI, Luna remembers your history and provides deeply personalized context.</p>
          </div>
        </div>
      </section>

      {/* 4. PARALLAX MEDIA */}
      <section ref={parallaxRef} className="relative h-[70vh] w-full overflow-hidden flex items-center justify-center my-24 z-10">
        <div 
          ref={parallaxBgRef} 
          className="absolute inset-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(247,196,200,0.08)_0%,transparent_60%)] will-change-transform"
        />
        <div className="relative z-20 text-center px-6 p-20 bg-black/20 backdrop-blur-3xl rounded-[3rem] border border-white/5 shadow-2xl">
          <h2 className="font-serif text-5xl md:text-8xl text-[#FFF5F5] drop-shadow-[0_0_30px_rgba(255,245,245,0.2)] mb-6 tracking-wide">Breathe.</h2>
          <p className="text-[#E5D5D5] opacity-80 text-2xl max-w-lg mx-auto font-light tracking-wide">Your cycle shouldn't be stressful.</p>
        </div>
      </section>

      {/* 5. CTA SECTION */}
      <section className="py-40 px-6 text-center z-10 relative">
        <h2 className="font-serif text-5xl md:text-7xl text-[#FFF5F5] mb-12 tracking-wide">Ready to meet Luna?</h2>
        <Link 
          href="/login" 
          ref={ctaBtnRef as any}
          className="inline-flex h-16 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md px-14 font-medium text-[#FFF5F5] shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-all will-change-transform tracking-wide"
        >
          Start Tracking
        </Link>
      </section>

      <footer className="py-12 text-center text-sm font-light text-[#E5D5D5] opacity-40 z-10 relative border-t border-white/5">
        <p>© {new Date().getFullYear()} Luna. Designed with precision & moody motion.</p>
      </footer>
    </div>
  );
}

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
        duration: 1.2,
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
        scale: 1.3,
        opacity: 0.3,
        ease: "none"
      }).to(heroTextRef.current, {
        opacity: 0,
        y: -50,
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
        y: 40,
        duration: 0.6,
        stagger: 0.15,
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
        const FRAME_COUNT = 150; // UPDATE THIS: Match the number of frames exported
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
            
            // Calculate scale to "object-fit: cover"
            const img = images[frames.frame];
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            
            context.drawImage(img, x, y, img.width * scale, img.height * scale);
          }
        };

        // Render first frame on load
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
        y: "20%", // Moves at a fraction of scroll speed
        ease: "none"
      });

      // 5. CTA SECTION
      gsap.from(ctaBtnRef.current, {
        scrollTrigger: {
          trigger: ctaBtnRef.current,
          start: "top 90%",
          once: true,
        },
        scale: 0.8,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(1.5)"
      });
      
    });

    return () => mm.revert();
  }, { scope: container });

  return (
    <div ref={container} className="bg-[#FCFBFB] font-sans selection:bg-[#F7C4C8] selection:text-white">
      
      {/* 1. HERO SECTION */}
      <section ref={heroRef} className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        {/* Placeholder for Video Frame Sequence / Background */}
        <div 
          ref={heroBgRef} 
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#FCFBFB] via-[#F7C4C8]/20 to-[#FCFBFB] -z-10 will-change-transform"
        />
        
        <div ref={heroTextRef} className="text-center px-4 will-change-transform">
          <h1 className="font-serif text-7xl md:text-9xl text-[#5A4A4D] mb-6 tracking-tight drop-shadow-sm">
            Luna
          </h1>
          <p className="text-xl md:text-2xl text-[#7A6A6D] opacity-90 max-w-lg mx-auto font-medium">
            Your beautiful, intelligent cycle tracker. Designed for peace of mind.
          </p>
        </div>
      </section>

      {/* 2. FEATURE REVEAL */}
      <section ref={featuresContainerRef} className="py-32 px-6 md:px-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl text-[#5A4A4D] mb-4">Intelligently soft</h2>
          <p className="text-[#7A6A6D] opacity-80 max-w-md mx-auto">Everything you need, nothing you don't. Built with magic and motion.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "Cycle Predictions", desc: "Adaptive algorithms learn your unique rhythm.", icon: <Calendar className="text-[#F4A6A6] w-6 h-6" /> },
            { title: "Symptom Tracking", desc: "Log moods and symptoms naturally via chat.", icon: <Heart className="text-[#F4A6A6] w-6 h-6" /> },
            { title: "Luna AI", desc: "A supportive companion available 24/7.", icon: <Sparkles className="text-[#F4A6A6] w-6 h-6" /> }
          ].map((feature, i) => (
            <div key={i} className="feature-card will-change-transform bg-white/60 backdrop-blur-sm p-10 rounded-3xl border border-[#F7C4C8]/20 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col items-start text-left">
              <div className="bg-[#F7C4C8]/10 p-4 rounded-2xl mb-6">
                {feature.icon}
              </div>
              <h3 className="font-serif text-2xl text-[#5A4A4D] mb-3">{feature.title}</h3>
              <p className="text-[#7A6A6D] opacity-80 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. STICKY SCROLL NARRATIVE */}
      <section ref={narrativeContainerRef} className="h-screen w-full relative bg-[#F7C4C8]/5 flex items-center overflow-hidden">
        {/* Left Side: Mock Video/Image Frame */}
        <div className="w-1/2 h-full flex items-center justify-center p-12">
          <div className="w-full max-w-md aspect-[9/16] bg-white rounded-[2.5rem] shadow-xl border-8 border-white/50 relative overflow-hidden flex items-center justify-center">
             <canvas id="video-canvas" width="1080" height="1920" className="absolute w-full h-full object-cover" />
          </div>
        </div>

        {/* Right Side: Swapping Text */}
        <div className="w-1/2 h-full relative flex flex-col justify-center px-12 md:px-24">
          <div ref={narrativeText1Ref} className="absolute w-full max-w-md pr-12 will-change-transform">
            <Moon className="w-10 h-10 text-[#B4A6C4] mb-6" />
            <h2 className="font-serif text-5xl text-[#5A4A4D] mb-6 leading-tight">Understand your phases.</h2>
            <p className="text-xl text-[#7A6A6D] opacity-80">Luna guides you through the menstrual, follicular, ovulatory, and luteal phases with gentle insights.</p>
          </div>
          
          <div ref={narrativeText2Ref} className="absolute w-full max-w-md pr-12 opacity-0 will-change-transform">
            <Heart className="w-10 h-10 text-[#F4A6A6] mb-6" />
            <h2 className="font-serif text-5xl text-[#5A4A4D] mb-6 leading-tight">Listen to your body.</h2>
            <p className="text-xl text-[#7A6A6D] opacity-80">Track cramps, mood swings, and energy levels seamlessly through natural conversation.</p>
          </div>

          <div ref={narrativeText3Ref} className="absolute w-full max-w-md pr-12 opacity-0 will-change-transform">
            <Sparkles className="w-10 h-10 text-[#EBCB8B] mb-6" />
            <h2 className="font-serif text-5xl text-[#5A4A4D] mb-6 leading-tight">Grok the pattern.</h2>
            <p className="text-xl text-[#7A6A6D] opacity-80">Powered by xAI, Luna remembers your history and provides deeply personalized context.</p>
          </div>
        </div>
      </section>

      {/* 4. PARALLAX MEDIA */}
      <section ref={parallaxRef} className="relative h-[70vh] w-full overflow-hidden flex items-center justify-center my-24">
        {/* Parallax Target - This div moves slower than scroll to create depth */}
        <div 
          ref={parallaxBgRef} 
          className="absolute inset-[-20%] w-[140%] h-[140%] bg-[#F7C4C8]/20 will-change-transform"
        >
          {/* Aesthetic Placeholder for the Video/Image */}
          <div className="w-full h-full opacity-30 bg-[url('https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=2576&auto=format&fit=crop')] bg-cover bg-center mix-blend-multiply" />
        </div>
        <div className="relative z-10 text-center px-6">
          <h2 className="font-serif text-5xl md:text-7xl text-white drop-shadow-md mb-6">Breathe.</h2>
          <p className="text-white/90 text-xl max-w-lg mx-auto font-medium drop-shadow-sm">Your cycle shouldn't be stressful.</p>
        </div>
      </section>

      {/* 5. CTA SECTION */}
      <section className="py-32 px-6 text-center">
        <h2 className="font-serif text-4xl md:text-6xl text-[#5A4A4D] mb-8">Ready to meet Luna?</h2>
        <Link href="/login" passHref legacyBehavior>
          <a
            ref={ctaBtnRef}
            className="inline-flex h-16 items-center justify-center rounded-full bg-[#F7C4C8] hover:bg-[#F4A6A6] px-12 font-bold text-white shadow-lg shadow-[#F7C4C8]/30 transition-colors will-change-transform"
          >
            Start Tracking
          </a>
        </Link>
      </section>

      <footer className="py-12 text-center text-sm font-medium text-[#7A6A6D] opacity-60">
        <p>© {new Date().getFullYear()} Luna. Designed with precision & motion.</p>
      </footer>
    </div>
  );
}

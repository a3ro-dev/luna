"use client"

import React, { useRef, useEffect } from "react";
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
  const heroTextContainerRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroDescRef = useRef<HTMLParagraphElement>(null);
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
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      
      // 1. HERO SECTION (Load Animation)
      // Animate the inner elements on load to prevent conflict with ScrollTrigger
      gsap.from([heroTitleRef.current, heroDescRef.current], {
        opacity: 0,
        y: 40,
        filter: "blur(8px)",
        duration: 1.2,
        stagger: 0.2,
        ease: "power3.out"
      });

      // Pin hero and fade/translate the CONTAINER on scroll
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
        scale: 1.1,
        opacity: 0.6,
        ease: "none"
      }, 0)
      .to(heroTextContainerRef.current, {
        opacity: 0,
        y: -80,
        ease: "none"
      }, 0);

      // 2. TYPOGRAPHIC FEATURE REVEAL
      gsap.utils.toArray<HTMLElement>('.feature-row').forEach((row, i) => {
        gsap.fromTo(row, 
          { opacity: 0, x: i % 2 === 0 ? -40 : 40, filter: "blur(8px)" },
          {
            opacity: 1, 
            x: 0, 
            filter: "blur(0px)",
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: row,
              start: "top 85%",
              once: true,
            }
          }
        );
      });

      // 3. STICKY SCROLL NARRATIVE
      // Use explicit fromTo for all states to guarantee perfect reversing
      const narrativeTl = gsap.timeline({
        scrollTrigger: {
          trigger: narrativeContainerRef.current,
          start: "top top",
          end: "+=300%",
          scrub: true,
          pin: true,
        }
      });

      narrativeTl
        // Ensure Text 1 is fully visible at start
        .set(narrativeText1Ref.current, { opacity: 1, y: 0 })
        .set([narrativeText2Ref.current, narrativeText3Ref.current], { opacity: 0, y: 40 })
        
        // Step 1 leaves, Step 2 enters
        .to(narrativeText1Ref.current, { opacity: 0, y: -40, duration: 1 })
        .to(narrativeText2Ref.current, { opacity: 1, y: 0, duration: 1 }, "<0.2")
        
        // Hold Step 2
        .to({}, { duration: 0.5 })
        
        // Step 2 leaves, Step 3 enters
        .to(narrativeText2Ref.current, { opacity: 0, y: -40, duration: 1 })
        .to(narrativeText3Ref.current, { opacity: 1, y: 0, duration: 1 }, "<0.2");

      // CANVAS IMAGE SEQUENCE SCRUBBING
      const canvas = document.querySelector("#video-canvas") as HTMLCanvasElement;
      if (canvas) {
        const context = canvas.getContext("2d");
        const FRAME_COUNT = 428; 
        const currentFrame = (index: number) => `/frames/frame_${(index + 1).toString().padStart(4, '0')}.jpg`;
        const images: HTMLImageElement[] = [];
        const frames = { frame: 0 };

        for (let i = 0; i < FRAME_COUNT; i++) {
          const img = new Image();
          img.src = currentFrame(i);
          images.push(img);
        }

        const render = () => {
          if (images[Math.round(frames.frame)] && context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            const img = images[Math.round(frames.frame)];
            // No 1.25x scaling to preserve original pixel quality!
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
            scrub: 0.1, // Faster scrub response
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
      gsap.fromTo(ctaBtnRef.current, 
        { scale: 0.9, opacity: 0, y: 20 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "back.out(1.5)",
          scrollTrigger: {
            trigger: ctaBtnRef.current,
            start: "top 90%",
            once: true,
          }
        }
      );
      
    });

    return () => mm.revert();
  }, { scope: container });

  return (
    <div ref={container} className="bg-[#FCFBFB] font-sans selection:bg-[#F7C4C8] selection:text-white overflow-x-hidden">
      
      {/* 1. HERO SECTION */}
      <section ref={heroRef} className="relative h-screen w-full flex flex-col items-center justify-center z-10">
        <div 
          ref={heroBgRef} 
          className="absolute inset-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-[#FCFBFB] via-[#F7C4C8]/20 to-[#FCFBFB] -z-10 will-change-transform"
        />
        
        <div ref={heroTextContainerRef} className="text-center px-6 will-change-transform max-w-4xl">
          <h1 ref={heroTitleRef} className="font-serif text-7xl md:text-[9rem] text-[#5A4A4D] mb-6 tracking-tight leading-none drop-shadow-sm">
            Luna
          </h1>
          <p ref={heroDescRef} className="text-xl md:text-3xl text-[#7A6A6D] opacity-90 max-w-2xl mx-auto font-medium leading-relaxed">
            Your beautiful, intelligent cycle tracker. Designed for peace of mind.
          </p>
        </div>
      </section>

      {/* 2. TYPOGRAPHIC FEATURE REVEAL */}
      <section ref={featuresContainerRef} className="py-40 px-6 md:px-24 max-w-6xl mx-auto z-10 relative">
        <div className="mb-32 max-w-2xl">
          <h2 className="font-serif text-5xl md:text-6xl text-[#5A4A4D] mb-6 tracking-tight">Intelligently soft.</h2>
          <p className="text-2xl text-[#7A6A6D] opacity-80 leading-relaxed font-medium">
            Everything you need, nothing you don't. We stripped away the visual clutter of traditional trackers so you can focus on how you actually feel.
          </p>
        </div>
        
        <div className="flex flex-col gap-24 md:gap-32">
          {[
            { num: "01", title: "Cycle Predictions", desc: "Adaptive algorithms learn your unique rhythm. Luna gets smarter with every cycle you log, providing accurate windows without the stress.", icon: <Calendar className="text-[#F4A6A6] w-8 h-8" /> },
            { num: "02", title: "Symptom Tracking", desc: "Log your moods, pain levels, and energy naturally via chat. No more overwhelming forms or identical symptom bubbles to tap.", icon: <Heart className="text-[#F4A6A6] w-8 h-8" /> },
            { num: "03", title: "Luna AI", desc: "A supportive, gentle companion available 24/7. She remembers your unique history to give you the clarity you deserve.", icon: <Sparkles className="text-[#EBCB8B] w-8 h-8" /> }
          ].map((feature, i) => (
            <div key={i} className="feature-row will-change-transform flex flex-col md:flex-row items-start gap-8 md:gap-16">
              <span className="font-serif text-[#F7C4C8] text-6xl md:text-8xl opacity-40 tracking-tighter leading-none shrink-0 mt-2">
                {feature.num}
              </span>
              <div className="max-w-xl">
                <div className="bg-[#F7C4C8]/15 w-16 h-16 flex items-center justify-center rounded-[1.25rem] mb-8 shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="font-serif text-4xl text-[#5A4A4D] mb-4">{feature.title}</h3>
                <p className="text-[#7A6A6D] text-xl opacity-90 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. STICKY SCROLL NARRATIVE */}
      <section ref={narrativeContainerRef} className="h-screen w-full relative bg-white/50 flex items-center overflow-hidden z-10 border-y border-[#F7C4C8]/10">
        
        {/* Left Side: Video Canvas Frame */}
        <div className="w-full md:w-1/2 h-full flex items-center justify-center p-8 md:p-12 absolute md:relative opacity-20 md:opacity-100 -z-10 md:z-auto">
          <div className="w-full max-w-lg aspect-[3/4] bg-[#FCFBFB] rounded-[2.5rem] shadow-[0_30px_60px_rgba(247,196,200,0.3)] border-8 border-white relative overflow-hidden flex items-center justify-center">
             <canvas id="video-canvas" width="1080" height="1920" className="absolute w-full h-full object-cover" />
             
             {/* Gradient Mask to hide bottom watermark gracefully without scaling */}
             <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-white via-white/80 to-transparent z-10 pointer-events-none" />
          </div>
        </div>

        {/* Right Side: Swapping Text */}
        <div className="w-full md:w-1/2 h-full relative flex flex-col justify-center px-8 md:px-24 pointer-events-none">
          <div ref={narrativeText1Ref} className="absolute w-full max-w-lg pr-12 will-change-transform">
            <Moon className="w-12 h-12 text-[#B4A6C4] mb-8" />
            <h2 className="font-serif text-5xl md:text-6xl text-[#5A4A4D] mb-6 leading-tight tracking-tight">Understand your phases.</h2>
            <p className="text-2xl text-[#7A6A6D] opacity-90 leading-relaxed font-medium">Luna guides you through the menstrual, follicular, ovulatory, and luteal phases with gentle, actionable insights.</p>
          </div>
          
          <div ref={narrativeText2Ref} className="absolute w-full max-w-lg pr-12 opacity-0 will-change-transform">
            <Heart className="w-12 h-12 text-[#F4A6A6] mb-8" />
            <h2 className="font-serif text-5xl md:text-6xl text-[#5A4A4D] mb-6 leading-tight tracking-tight">Listen to your body.</h2>
            <p className="text-2xl text-[#7A6A6D] opacity-90 leading-relaxed font-medium">Track cramps, mood swings, and energy levels seamlessly through natural, open-ended conversation.</p>
          </div>

          <div ref={narrativeText3Ref} className="absolute w-full max-w-lg pr-12 opacity-0 will-change-transform">
            <Sparkles className="w-12 h-12 text-[#EBCB8B] mb-8" />
            <h2 className="font-serif text-5xl md:text-6xl text-[#5A4A4D] mb-6 leading-tight tracking-tight">Spot your patterns.</h2>
            <p className="text-2xl text-[#7A6A6D] opacity-90 leading-relaxed font-medium">Luna gently remembers your history, helping you connect the dots over time with deeply personalized clarity.</p>
          </div>
        </div>
      </section>

      {/* 4. PARALLAX MEDIA */}
      <section ref={parallaxRef} className="relative h-[70vh] w-full overflow-hidden flex items-center justify-center z-10 mt-32">
        <div 
          ref={parallaxBgRef} 
          className="absolute inset-[-20%] w-[140%] h-[140%] bg-[#F7C4C8]/20 will-change-transform"
        >
          <div className="w-full h-full opacity-60 bg-[url('https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=2576&auto=format&fit=crop')] bg-cover bg-center mix-blend-multiply" />
        </div>
        <div className="relative z-20 text-center px-6">
          <h2 className="font-serif text-6xl md:text-[8rem] text-white drop-shadow-md mb-6 leading-none">Breathe.</h2>
          <p className="text-white/95 text-2xl md:text-3xl max-w-2xl mx-auto font-medium drop-shadow-sm">Your cycle shouldn't be stressful.</p>
        </div>
      </section>

      {/* 5. CTA SECTION */}
      <section className="py-40 px-6 text-center z-10 relative bg-[#FCFBFB]">
        <h2 className="font-serif text-5xl md:text-7xl text-[#5A4A4D] mb-12 tracking-tight">Ready to meet Luna?</h2>
        <Link 
          href="/login" 
          ref={ctaBtnRef as any}
          className="inline-flex h-16 items-center justify-center rounded-full bg-[#F7C4C8] hover:bg-[#F4A6A6] px-14 font-bold text-white shadow-lg shadow-[#F7C4C8]/30 transition-transform will-change-transform text-lg"
        >
          Start Tracking
        </Link>
      </section>

      <footer className="py-12 text-center text-sm font-medium text-[#7A6A6D] opacity-50 z-10 relative border-t border-[#F7C4C8]/20">
        <p>© {new Date().getFullYear()} Luna. Designed with precision & motion.</p>
      </footer>
    </div>
  );
}

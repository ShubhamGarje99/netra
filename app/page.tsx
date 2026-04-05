"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Crosshair,
  ShieldAlert,
  TerminalSquare,
  ArrowRight,
} from "lucide-react";
import { useLenis } from "@/hooks/useLenis";
import { useSafeSectionAnimations } from "@/hooks/useSafeSectionAnimations";
import { Drone3D } from "@/components/shared/Drone3D";
import { useSimulation } from "@/hooks/useSimulation";
import { useSimulationStore } from "@/store/simulation-store";
import { TerminalLog } from "@/components/home/TerminalLog";
import { AnimatedCounter } from "@/components/home/AnimatedCounter";


export default function Home() {
  useSimulation();

  const lenisRef = useLenis();
  useSafeSectionAnimations();
  const stats = useSimulationStore((s) => s.stats);
  const incidents = useSimulationStore((s) => s.incidents);
  const drones = useSimulationStore((s) => s.drones);
  const activeIncidents = incidents.filter((i) => i.status !== "resolved");
  const dronesOnline = stats.dronesActive + stats.dronesIdle;

  const avgResponse = stats.avgResponseTime > 0
    ? (stats.avgResponseTime / 60)
    : 0;
  
  // Real or mock data for the stats
  const totalIncidentsDetected = stats.totalIncidents > 0 ? stats.totalIncidents : 64;
  const dronesDeployed = dronesOnline > 0 ? dronesOnline : 8;
  const responseTimeMin = avgResponse > 0 ? avgResponse : 1.4;
  const totalDrones = stats.dronesActive + stats.dronesIdle;
  const coverageArea = totalDrones > 0 ? (totalDrones * 1.54) : 12.3;

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 60;
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(top, { duration: 1.1 });
      return;
    }
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <main className="bg-void text-signal font-sans">
      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-50 border-b border-[#00FFB2]/20 bg-[#0A0A0F]/60 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,255,178,0.05)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 md:px-12 py-4">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-3 h-3 bg-[#00FFB2] rounded-sm group-hover:shadow-[0_0_15px_rgba(0,255,178,0.8)] transition-shadow animate-pulse" />
            <div className="font-mono text-sm tracking-widest text-[#FFFFFF] group-hover:text-[#00FFB2] transition-colors">NETRA</div>
          </div>
          <div className="hidden md:flex items-center gap-8 font-mono text-[11px] tracking-[0.2em] text-[#888888] uppercase">
            <button type="button" onClick={() => scrollToId("system")} className="hover:text-[#00FFB2] hover:drop-shadow-[0_0_8px_rgba(0,255,178,0.8)] transition-all">System</button>
            <button type="button" onClick={() => scrollToId("technology")} className="hover:text-[#00FFB2] hover:drop-shadow-[0_0_8px_rgba(0,255,178,0.8)] transition-all">Architecture</button>
          </div>
          <Link
            href="/dashboard"
            className="relative overflow-hidden border border-[#00FFB2]/50 px-5 py-2 font-mono text-xs tracking-[0.2em] text-[#00FFB2] transition-all hover:bg-[#00FFB2]/20 hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] uppercase group"
          >
            <span className="relative z-10">Get Access</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00FFB2]/20 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]" />
          </Link>
        </div>
      </header>

      {/* ── 1. HERO ── */}
      <section className="relative min-h-[100vh] pt-12 flex flex-col justify-center overflow-hidden border-b border-[#1F2433] bg-[#0A0A0F]">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,255,178,0.15)_0%,rgba(10,10,15,1)_60%)]" />
        <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [background-size:24px_24px] pointer-events-none" />
        
        <div className="container relative z-10 mx-auto px-6 md:px-12 max-w-[1440px] pt-10 pb-20 flex-1 flex flex-col items-center justify-start">
          
          {/* Top Title: NETRA AI */}
          <div className="text-center relative z-30 flex flex-col items-center justify-center mt-8 md:mt-16">
            <h1 className="font-display text-7xl md:text-[140px] leading-none tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] to-[#888888] drop-shadow-[0_0_80px_rgba(0,255,178,0.3)]">
              NETRA AI
            </h1>
            <div className="font-mono text-sm md:text-base tracking-[0.5em] text-[#00FFB2] mt-6 transform md:ml-4 uppercase drop-shadow-[0_0_15px_rgba(0,255,178,0.6)] font-bold">
              Autonomous Swarm Intelligence
            </div>
          </div>

          {/* Center: 3D Drone & Highlights */}
          <div className="relative w-full max-w-[1200px] h-[550px] md:h-[650px] flex items-center justify-center mt-4">

            {/* The Huge Drone */}
            <div className="absolute z-20 pointer-events-none flex items-center justify-center scale-110 md:scale-150">
              <Drone3D />
            </div>

            {/* Simulation Highlights Around It */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-30 hidden md:block">
               {/* TL */}
               <div className="absolute top-[20%] left-[5%] text-left">
                 <div className="font-mono text-[11px] text-[#00FFB2] tracking-widest mb-2 uppercase drop-shadow-[0_0_10px_rgba(0,255,178,0.5)] flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-[#00FFB2] rounded-full animate-pulse" /> Perception
                 </div>
                 <div className="text-2xl text-[#FFFFFF] font-medium tracking-tight mb-1">YOLOv8 Vision</div>
                 <div className="text-[13px] text-[#888888] max-w-[150px] leading-relaxed">Real-time threat & incident detection pipeline</div>
                 <svg className="absolute left-[110%] top-[40%] w-32 h-px opacity-40 mix-blend-screen" overflow="visible"><line x1="0" y1="0" x2="100" y2="40" stroke="#00FFB2" /></svg>
               </div>

               {/* TR */}
               <div className="absolute top-[20%] right-[5%] text-right">
                 <div className="font-mono text-[11px] text-[#00FFB2] tracking-widest mb-2 uppercase drop-shadow-[0_0_10px_rgba(0,255,178,0.5)] flex items-center justify-end gap-2">
                   Telemetry <span className="w-1.5 h-1.5 bg-[#00FFB2] rounded-full animate-pulse" />
                 </div>
                 <div className="text-xl text-[#FFFFFF] font-medium tracking-tight mb-1 max-w-[150px] ml-auto">Full Situational Awareness</div>
                 <div className="text-[13px] text-[#888888] max-w-[150px] leading-relaxed ml-auto">Low-latency data flow.</div>
                 <svg className="absolute right-[110%] top-[40%] w-32 h-px opacity-40 mix-blend-screen" overflow="visible"><line x1="100" y1="0" x2="0" y2="40" stroke="#00FFB2" /></svg>
               </div>

               {/* BL */}
               <div className="absolute bottom-[20%] left-[5%] text-left">
                 <div className="font-mono text-[11px] text-[#00FFB2] tracking-widest mb-2 uppercase drop-shadow-[0_0_10px_rgba(0,255,178,0.5)] flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-[#00FFB2] rounded-full animate-pulse" /> Navigation
                 </div>
                 <div className="text-2xl text-[#FFFFFF] font-medium tracking-tight mb-1">A* Pathfinding</div>
                 <div className="text-[13px] text-[#888888] max-w-[150px] leading-relaxed">Dynamic global routing & NFZ avoidance</div>
                 <svg className="absolute left-[110%] bottom-[40%] w-32 h-px opacity-40 mix-blend-screen" overflow="visible"><line x1="0" y1="0" x2="100" y2="-40" stroke="#00FFB2" /></svg>
               </div>

               {/* BR */}
               <div className="absolute bottom-[20%] right-[5%] text-right">
                 <div className="font-mono text-[11px] text-[#00FFB2] tracking-widest mb-2 uppercase drop-shadow-[0_0_10px_rgba(0,255,178,0.5)] flex items-center justify-end gap-2">
                   Coordination <span className="w-1.5 h-1.5 bg-[#00FFB2] rounded-full animate-pulse" />
                 </div>
                 <div className="text-2xl text-[#FFFFFF] font-medium tracking-tight mb-1">Swarm Logic</div>
                 <div className="text-[13px] text-[#888888] max-w-[150px] leading-relaxed ml-auto">Autonomous incident dispatch & scaling</div>
                 <svg className="absolute right-[110%] bottom-[40%] w-32 h-px opacity-40 mix-blend-screen" overflow="visible"><line x1="100" y1="0" x2="0" y2="-40" stroke="#00FFB2" /></svg>
               </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full mt-4 md:mt-8 z-30 relative">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto text-center px-10 py-5 bg-[#00FFB2] text-[#0A0A0F] font-mono font-bold text-sm tracking-widest uppercase transition-transform hover:scale-[0.98] shadow-[0_0_30px_rgba(0,255,178,0.3)]"
            >
              Launch Simulation
            </Link>
            <Link
              href="#technology"
              className="w-full sm:w-auto text-center px-10 py-5 border border-[#1F2433] text-[#FFFFFF] font-mono text-sm tracking-widest uppercase transition-colors hover:bg-[#161A25]"
            >
              View Architecture
            </Link>
          </div>

        </div>

        {/* Live Ticker */}
        <div className="absolute bottom-0 w-full border-t border-[#1F2433] bg-[#0A0A0F]/90 backdrop-blur overflow-hidden z-20">
          <div className="whitespace-nowrap py-3 font-mono text-[10px] tracking-widest text-[#00FFB2]/70 flex animate-scroll-line" style={{ animationDirection: 'normal', animationDuration: '30s', animationTimingFunction: 'linear', animationName: 'marquee' }}>
            <span className="inline-block px-8">{totalIncidentsDetected} incidents resolved</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">avg response {responseTimeMin} min</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">{dronesDeployed} drones active</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">{coverageArea.toFixed(1)} km² coverage</span>
            {/* Duplicate for seamless loop */}
            <span className="inline-block px-8">{totalIncidentsDetected} incidents detected</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">avg response {responseTimeMin.toFixed(1)} min</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">{dronesDeployed} drones active</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">{coverageArea.toFixed(1)} km² coverage</span>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
        `}} />
      </section>

      {/* ── 2. LIVE SYSTEM STATUS BAR ── */}
      <section id="system" className="relative border-y border-[#00FFB2]/20 bg-[#0F111A]/80 backdrop-blur-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00FFB2]/5 via-transparent to-[#8B5CF6]/5 pointer-events-none" />
        <div className="mx-auto max-w-[1440px] h-auto lg:h-[140px] grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#1F2433]/50 relative z-10">
          <div className="flex flex-col items-center justify-center p-8 text-center group hover:bg-[#161A25]/50 transition-colors">
            <div className="text-[#00FFB2] drop-shadow-[0_0_15px_rgba(0,255,178,0.8)] font-display text-4xl mb-2"><AnimatedCounter value={totalIncidentsDetected} /></div>
            <div className="font-mono text-[10px] text-[#888888] tracking-[0.3em] uppercase group-hover:text-[#FFFFFF] transition-colors">Incidents Detected</div>
          </div>
          <div className="flex flex-col items-center justify-center p-8 text-center group hover:bg-[#161A25]/50 transition-colors">
            <div className="text-[#00FFB2] drop-shadow-[0_0_15px_rgba(0,255,178,0.8)] font-display text-4xl mb-2"><AnimatedCounter value={dronesDeployed} /></div>
            <div className="font-mono text-[10px] text-[#888888] tracking-[0.3em] uppercase group-hover:text-[#FFFFFF] transition-colors">Drones Deployed</div>
          </div>
          <div className="flex flex-col items-center justify-center p-8 text-center group hover:bg-[#161A25]/50 transition-colors">
            <div className="text-[#00FFB2] drop-shadow-[0_0_15px_rgba(0,255,178,0.8)] font-display text-4xl mb-2"><AnimatedCounter value={responseTimeMin} decimals={1} suffix="m" /></div>
            <div className="font-mono text-[10px] text-[#888888] tracking-[0.3em] uppercase group-hover:text-[#FFFFFF] transition-colors">Avg Response</div>
          </div>
          <div className="flex flex-col items-center justify-center p-8 text-center group hover:bg-[#161A25]/50 transition-colors">
            <div className="text-[#00FFB2] drop-shadow-[0_0_15px_rgba(0,255,178,0.8)] font-display text-4xl mb-2"><AnimatedCounter value={coverageArea} decimals={1} suffix=" km²" /></div>
            <div className="font-mono text-[10px] text-[#888888] tracking-[0.3em] uppercase group-hover:text-[#FFFFFF] transition-colors">Coverage Area</div>
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ── */}
      <section className="py-32 relative border-b border-[#1F2433] bg-[#0A0A0F] overflow-hidden">
        {/* Intense Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,178,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,178,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
        
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] relative z-10">
          <div className="text-center mb-24">
            <h2 className="font-display text-4xl md:text-5xl text-[#FFFFFF] tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">Autonomous Protocol</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
            
            <div className="relative group section-content p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:bg-[#00FFB2]/5 hover:border-[#00FFB2]/30 hover:shadow-[0_0_40px_rgba(0,255,178,0.15)] overflow-hidden lg:mt-24">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FFB2]/20 blur-[60px] group-hover:bg-[#00FFB2]/40 transition-colors" />
              <div className="font-mono text-xs text-[#00FFB2] tracking-widest mb-8 drop-shadow-[0_0_5px_rgba(0,255,178,0.8)]">PHASE 01</div>
              <div className="w-14 h-14 rounded-lg border border-[#00FFB2]/30 bg-[#161A25] flex items-center justify-center mb-8 group-hover:border-[#00FFB2] group-hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all">
                <Crosshair className="w-6 h-6 text-[#00FFB2] drop-shadow-[0_0_8px_rgba(0,255,178,0.8)]" />
              </div>
              <h3 className="text-2xl font-medium text-[#FFFFFF] mb-4 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Detection</h3>
              <p className="text-[#888888] leading-relaxed text-sm max-w-sm group-hover:text-[#AAAAAA]">
                Computer vision identifies incidents across CCTV feeds in real time, filtering noise with high precision confidence models.
              </p>
            </div>

            <div className="relative group section-content p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:bg-[#00FFB2]/5 hover:border-[#00FFB2]/30 hover:shadow-[0_0_40px_rgba(0,255,178,0.15)] overflow-hidden lg:mt-12">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FFB2]/20 blur-[60px] group-hover:bg-[#00FFB2]/40 transition-colors" />
              <div className="font-mono text-xs text-[#00FFB2] tracking-widest mb-8 drop-shadow-[0_0_5px_rgba(0,255,178,0.8)]">PHASE 02</div>
              <div className="w-14 h-14 rounded-lg border border-[#00FFB2]/30 bg-[#161A25] flex items-center justify-center mb-8 group-hover:border-[#00FFB2] group-hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all">
                <Activity className="w-6 h-6 text-[#00FFB2] drop-shadow-[0_0_8px_rgba(0,255,178,0.8)]" />
              </div>
              <h3 className="text-2xl font-medium text-[#FFFFFF] mb-4 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Dispatch</h3>
              <p className="text-[#888888] leading-relaxed text-sm max-w-sm group-hover:text-[#AAAAAA]">
                The nearest available drone is autonomously assigned and routed, dynamically avoiding no-fly zones through A* pathfinding.
              </p>
            </div>

            <div className="relative group section-content p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:bg-[#00FFB2]/5 hover:border-[#00FFB2]/30 hover:shadow-[0_0_40px_rgba(0,255,178,0.15)] overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FFB2]/20 blur-[60px] group-hover:bg-[#00FFB2]/40 transition-colors" />
              <div className="font-mono text-xs text-[#00FFB2] tracking-widest mb-8 drop-shadow-[0_0_5px_rgba(0,255,178,0.8)]">PHASE 03</div>
              <div className="w-14 h-14 rounded-lg border border-[#00FFB2]/30 bg-[#161A25] flex items-center justify-center mb-8 group-hover:border-[#00FFB2] group-hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all">
                <ShieldAlert className="w-6 h-6 text-[#00FFB2] drop-shadow-[0_0_8px_rgba(0,255,178,0.8)]" />
              </div>
              <h3 className="text-2xl font-medium text-[#FFFFFF] mb-4 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Resolution</h3>
              <p className="text-[#888888] leading-relaxed text-sm max-w-sm group-hover:text-[#AAAAAA]">
                Live feed, telemetry, and on-scene response—all securely logged and managed autonomously for real-time situational awareness.
              </p>
            </div>

          </div>
        </div>
      </section>



      {/* ── 6. TECH STACK ── */}
      <section id="technology" className="py-32 relative bg-[#0F111A] border-b border-[#1F2433] overflow-hidden">
        <div className="absolute top-1/2 left-3/4 -translate-y-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#00FFB2]/5 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] section-content relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-5xl text-[#FFFFFF] mb-8 tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">Intelligence at the Edge</h2>
              <p className="text-[#888888] text-lg leading-relaxed mb-10 max-w-lg">
                NETRA's architecture is built for continuous, low-latency operations. It processes raw CCTV feeds using YOLOv8, maps detections to coordinates, and broadcasts dispatch payloads via Server-Sent Events—all asynchronously.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Next.js", "TypeScript", "Python", "YOLOv8", "Leaflet", "Zustand", "FastAPI", "SSE"].map(badge => (
                  <span key={badge} className="px-4 py-2 border border-[#00FFB2]/20 bg-[#00FFB2]/5 rounded-full text-xs font-mono text-[#00FFB2] drop-shadow-[0_0_5px_rgba(0,255,178,0.5)] shadow-[inset_0_0_10px_rgba(0,255,178,0.1)]">{badge}</span>
                ))}
              </div>
            </div>
            
            {/* Terminal Block */}
            <div className="w-full relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00FFB2] to-[#8B5CF6] rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <div className="relative shadow-2xl rounded-xl overflow-hidden ring-1 ring-white/10">
                <TerminalLog />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. SOCIAL PROOF ── */}
      <section className="py-32 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMGEwYTBmIiAvPgo8cGF0aCBkPSJNMCAwTDggOFoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=')] border-b border-[#1F2433]">
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] section-content">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-12 lg:p-20 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00FFB2]/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#3B82F6]/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none z-0" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 relative z-10">
              <div className="flex flex-col md:items-center text-center relative z-10 group px-4 md:px-8 lg:px-12">
                <div className="font-display text-4xl md:text-5xl mb-4 pb-1 md:pb-2 tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] to-[#888888] group-hover:from-[#00FFB2] group-hover:to-[#00aa77] transition-all drop-shadow-[0_0_25px_rgba(0,255,178,0)] group-hover:drop-shadow-[0_0_25px_rgba(0,255,178,0.5)]">Explainable AI</div>
                <div className="font-mono text-xs tracking-[0.2em] text-[#00FFB2] uppercase mb-2">Transparent Matrix</div>
                <div className="text-sm text-[#888888]">Real-time decision logs surfacing exact mathematical dispatch weights</div>
              </div>
              <div className="flex flex-col md:items-center text-center pt-12 md:pt-0 relative z-10 group px-4 md:px-8 lg:px-12">
                <div className="font-display text-4xl md:text-5xl mb-4 pb-1 md:pb-2 tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] to-[#888888] group-hover:from-[#8B5CF6] group-hover:to-[#5B21B6] transition-all drop-shadow-[0_0_25px_rgba(139,92,246,0)] group-hover:drop-shadow-[0_0_25px_rgba(139,92,246,0.5)]">Smart Charging</div>
                <div className="font-mono text-xs tracking-[0.2em] text-[#8B5CF6] uppercase mb-2">Automated RTB</div>
                <div className="text-sm text-[#888888]">Self-regulating fleet with autonomous Pod routing logic</div>
              </div>
              <div className="flex flex-col md:items-center text-center pt-12 md:pt-0 relative z-10 group px-4 md:px-8 lg:px-12">
                <div className="font-display text-4xl md:text-5xl mb-4 pb-1 md:pb-2 tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] to-[#888888] group-hover:from-[#3B82F6] group-hover:to-[#1D4ED8] transition-all drop-shadow-[0_0_25px_rgba(59,130,246,0)] group-hover:drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]">Custom Engine</div>
                <div className="font-mono text-xs tracking-[0.2em] text-[#3B82F6] uppercase mb-2">High-Fidelity Physics</div>
                <div className="text-sm text-[#888888]">Custom TypeScript physics and environment state logic</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. CTA FOOTER ── */}
      <section className="pt-16 pb-12 bg-[#0F111A] relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-[radial-gradient(ellipse_at_bottom,rgba(0,255,178,0.1)_0%,transparent_60%)] pointer-events-none" />
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] flex flex-col items-center section-content relative z-10">
          <div className="w-full border-t border-[#1F2433] pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="font-mono text-[#888888] text-[11px] uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#FF3B3B] rounded-full animate-pulse" />
              Built by Team Phoenix · COEP Technological University · CSI Hackathon 2025
            </div>
            <div className="font-mono text-[#888888] text-[11px] uppercase tracking-widest opacity-50 hover:text-[#00FFB2] hover:opacity-100 transition-all cursor-pointer">
              © {currentYear} NETRA Systems
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

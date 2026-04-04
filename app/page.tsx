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
  Github,
  Cpu,
  Network
} from "lucide-react";
import { useLenis } from "@/hooks/useLenis";
import { useSafeSectionAnimations } from "@/hooks/useSafeSectionAnimations";
import { Drone3D } from "@/components/shared/Drone3D";

import { useSimulationStore } from "@/store/simulation-store";
import { TerminalLog } from "@/components/home/TerminalLog";
import { AnimatedCounter } from "@/components/home/AnimatedCounter";


export default function Home() {
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
  const totalIncidentsDetected = stats.totalIncidents > 0 ? stats.totalIncidents : 14;
  const dronesDeployed = dronesOnline > 0 ? dronesOnline : 3;
  const responseTimeMin = avgResponse > 0 ? avgResponse : 2.3;
  const coverageKmSq = 12.3;

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
    <main className="bg-void text-signal font-sans overflow-x-hidden">
      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-50 border-b border-[#1F2433] bg-[#0A0A0F]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 md:px-12 py-4">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-3 h-3 bg-[#00FFB2] rounded-sm group-hover:shadow-[0_0_12px_#00FFB2] transition-all duration-300" />
            <div className="font-mono text-sm tracking-widest text-[#FFFFFF] font-bold">NETRA</div>
          </div>
          <div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-wider text-[#888888]">
            <button type="button" onClick={() => scrollToId("pipeline")} className="hover:text-[#00FFB2] transition-colors">Pipeline</button>

            <button type="button" onClick={() => scrollToId("technology")} className="hover:text-[#00FFB2] transition-colors">Architecture</button>
          </div>
          <div className="flex gap-4">
            <Link
              href="https://github.com/ShubhamGarje99/netra"
              target="_blank"
              className="hidden md:flex items-center gap-2 border border-[#1F2433] px-4 py-2 font-mono text-xs tracking-wider text-[#FFFFFF] transition-colors hover:bg-[#161A25]"
            >
              <Github className="w-4 h-4" /> Repo
            </Link>
            <Link
              href="/dashboard"
              className="relative overflow-hidden group border border-[#00FFB2] px-4 py-2 font-mono text-xs tracking-wider text-[#0A0A0F] font-bold transition-all hover:shadow-[0_0_20px_rgba(0,255,178,0.4)]"
            >
              <div className="absolute inset-0 bg-[#00FFB2] transition-transform duration-300 group-hover:scale-105" />
              <span className="relative z-10 flex items-center gap-2">Launch Dashboard <ArrowRight className="w-3 h-3" /></span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 1. HERO ── */}
      <section className="relative min-h-[calc(100vh-65px)] flex flex-col justify-center overflow-hidden border-b border-[#1F2433] bg-gradient-to-b from-[#0F111A] to-[#0A0A0F]">
        {/* Subtle grid and glows */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1F2433_1px,transparent_1px),linear-gradient(to_bottom,#1F2433_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#00FFB2]/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container relative z-10 mx-auto px-6 md:px-12 max-w-[1440px] text-center pt-20 pb-32 flex-1 flex flex-col justify-center items-center">

          
          <h1 className="font-display text-5xl md:text-[88px] leading-[1] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] to-[#888888] max-w-5xl mx-auto drop-shadow-2xl">
            AI-Powered Autonomous<br />Drone Response
          </h1>

          {/* MAIN SHOWCASE - Drone moved to Hero */}
          <div className="w-full max-w-[1200px] mx-auto flex-1 my-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[280px_1fr_280px] gap-6 items-center">
               
               {/* Left Column Callouts */}
               <div className="flex flex-col gap-6 order-2 lg:order-1 relative z-20">
                 <div className="bg-[#0A0A0F]/50 backdrop-blur-xl border border-[#1F2433] p-5 text-center hover:border-[#00FFB2]/50 hover:-translate-y-2 transition-all duration-300 shadow-xl group rounded-lg">
                   <div className="w-8 h-8 rounded bg-[#161A25] mx-auto mb-3 flex items-center justify-center border border-[#1F2433] group-hover:border-[#00FFB2]/30 transition-colors">
                      <Crosshair className="w-4 h-4 text-[#00FFB2]" />
                   </div>
                   <div className="text-[10px] text-[#00FFB2] tracking-widest mb-1 uppercase">Object Detection</div>
                   <div className="text-lg text-[#FFFFFF] mb-1 font-sans">YOLOv8 Inference</div>
                   <div className="text-xs text-[#888888]">Edge TPU Accelerated</div>
                 </div>

                 <div className="bg-[#0A0A0F]/50 backdrop-blur-xl border border-[#1F2433] p-5 text-center hover:border-[#00FFB2]/50 hover:-translate-y-2 transition-all duration-300 shadow-xl group rounded-lg">
                   <div className="w-8 h-8 rounded bg-[#161A25] mx-auto mb-3 flex items-center justify-center border border-[#1F2433] group-hover:border-[#00FFB2]/30 transition-colors">
                      <Cpu className="w-4 h-4 text-[#00FFB2]" />
                   </div>
                   <div className="text-[10px] text-[#00FFB2] tracking-widest mb-1 uppercase">Routing Engine</div>
                   <div className="text-lg text-[#FFFFFF] mb-1 font-sans">A* Pathfinding</div>
                   <div className="text-xs text-[#888888]">Dynamic No-fly Avoidance</div>
                 </div>
               </div>

               {/* Center Column Drone */}
               <div className="relative w-full flex items-center justify-center z-10 pointer-events-none drop-shadow-[0_0_50px_rgba(0,255,178,0.2)] h-[400px] md:h-[500px] order-1 lg:order-2 col-span-1 sm:col-span-2 lg:col-span-1">
                 <div className="scale-125 md:scale-[1.6] transform transition-transform duration-1000 ease-out origin-center">
                   <Drone3D />
                 </div>
               </div>

               {/* Right Column Callouts */}
               <div className="flex flex-col gap-6 order-3 relative z-20">
                 <div className="bg-[#0A0A0F]/50 backdrop-blur-xl border border-[#1F2433] p-5 text-center hover:border-[#00FFB2]/50 hover:-translate-y-2 transition-all duration-300 shadow-xl group rounded-lg">
                   <div className="w-8 h-8 rounded bg-[#161A25] mx-auto mb-3 flex items-center justify-center border border-[#1F2433] group-hover:border-[#00FFB2]/30 transition-colors">
                      <Network className="w-4 h-4 text-[#00FFB2]" />
                   </div>
                   <div className="text-[10px] text-[#00FFB2] tracking-widest mb-1 uppercase">Telemetry Link</div>
                   <div className="text-lg text-[#FFFFFF] mb-1 font-sans">WebSockets / SSE</div>
                   <div className="text-xs text-[#888888]">Bi-directional JSON</div>
                 </div>

                 <div className="bg-[#0A0A0F]/50 backdrop-blur-xl border border-[#1F2433] p-5 text-center hover:border-[#00FFB2]/50 hover:-translate-y-2 transition-all duration-300 shadow-xl group rounded-lg">
                   <div className="w-8 h-8 rounded bg-[#161A25] mx-auto mb-3 flex items-center justify-center border border-[#1F2433] group-hover:border-[#00FFB2]/30 transition-colors">
                      <Activity className="w-4 h-4 text-[#00FFB2]" />
                   </div>
                   <div className="text-[10px] text-[#00FFB2] tracking-widest mb-1 uppercase">Video Stream</div>
                   <div className="text-lg text-[#FFFFFF] mb-1 font-sans">MJPEG Server</div>
                   <div className="text-xs text-[#888888]">Canvas API rendering</div>
                 </div>
               </div>

            </div>
          </div>

          <p className="text-lg md:text-xl text-[#888888] max-w-3xl mx-auto mb-10 leading-relaxed font-light mt-10">
            Real-time urban incident detection and automated drone response. Built for speed, precision, and low-latency operation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-[#00FFB2] text-[#0A0A0F] font-mono font-bold text-sm tracking-widest uppercase transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,255,178,0.3)] flex items-center gap-3"
            >
              <Activity className="w-5 h-5" /> Launch Live Dashboard
            </Link>
            <button
              onClick={() => scrollToId("technology")}
              className="px-8 py-4 border border-[#1F2433] text-[#FFFFFF] font-mono text-sm tracking-widest uppercase transition-colors hover:bg-[#161A25] hover:border-[#888888] flex items-center gap-3 bg-[#0A0A0F]/50 backdrop-blur-sm"
            >
              <Cpu className="w-5 h-5" /> View Architecture
            </button>
          </div>
        </div>

        {/* Live Ticker */}
        <div className="absolute bottom-0 w-full border-t border-[#1F2433] bg-[#00FFB2]/5 backdrop-blur-md overflow-hidden z-20">
          <div className="whitespace-nowrap py-3 font-mono text-[10px] tracking-widest text-[#00FFB2] flex animate-scroll-line" style={{ animationDirection: 'normal', animationDuration: '30s', animationTimingFunction: 'linear', animationName: 'marquee' }}>
            <span className="inline-block px-8">{totalIncidentsDetected} incidents resolved</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">avg response {responseTimeMin} min</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">{dronesDeployed} drones active</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">{coverageKmSq} km² coverage</span>
            {/* Duplicate for seamless loop */}
            <span className="inline-block px-8">{totalIncidentsDetected} incidents resolved</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">avg response {responseTimeMin} min</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">{dronesDeployed} drones active</span>
            <span className="inline-block px-8">·</span>
            <span className="inline-block px-8">{coverageKmSq} km² coverage</span>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .scanline {
            background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(0,255,178,0.2) 50%, rgba(255,255,255,0));
            animation: scan 4s linear infinite;
          }
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(200%); }
          }
          .dash-flow {
            stroke-dasharray: 10, 10;
            animation: dash 2s linear infinite;
          }
          @keyframes dash {
            to { stroke-dashoffset: -20; }
          }
        `}} />
      </section>

      {/* ── 2. LIVE SYSTEM STATUS BAR ── */}
      <section className="border-b border-[#1F2433] bg-[#0A0A0F] relative z-20">
        <div className="mx-auto max-w-[1440px] h-[120px] grid grid-cols-2 md:grid-cols-4 divide-x divide-[#1F2433]">
          <div className="flex flex-col items-center justify-center p-6 text-center hover:bg-[#161A25] transition-colors">
            <AnimatedCounter value={totalIncidentsDetected} />
            <div className="font-mono text-xs text-[#888888] tracking-widest mt-2 uppercase">Incidents Detected</div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 text-center hover:bg-[#161A25] transition-colors border-b-2 border-b-transparent hover:border-b-[#00FFB2]">
            <AnimatedCounter value={dronesDeployed} />
            <div className="font-mono text-xs text-[#888888] tracking-widest mt-2 uppercase">Drones Deployed</div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 text-center hover:bg-[#161A25] transition-colors">
            <AnimatedCounter value={responseTimeMin} decimals={1} suffix="m" />
            <div className="font-mono text-xs text-[#888888] tracking-widest mt-2 uppercase">Avg Response Time</div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 text-center hover:bg-[#161A25] transition-colors">
            <AnimatedCounter value={coverageKmSq} decimals={1} suffix=" km²" />
            <div className="font-mono text-xs text-[#888888] tracking-widest mt-2 uppercase">Coverage Area</div>
          </div>
        </div>
      </section>

      {/* ── 3. PIPELINE HOW IT WORKS ── */}
      <section id="pipeline" className="py-32 relative border-b border-[#1F2433] bg-[#0A0A0F] overflow-hidden">
        {/* Tech Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(31,36,51,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(31,36,51,0.5)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />
        
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] relative z-10">
          <div className="text-center mb-24">
             <h2 className="font-display text-4xl text-[#FFFFFF] tracking-tight mb-4">Autonomous Pipeline</h2>
             <p className="text-[#888888] font-mono text-sm max-w-2xl mx-auto">Zero human intervention from detection to deployment.</p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 max-w-6xl mx-auto">
            
            {/* Animated SVG Connectors */}
            <svg className="hidden md:block absolute top-[60px] left-[20%] right-[20%] w-[60%] h-10 -z-10" overflow="visible">
               <line x1="0%" y1="0" x2="50%" y2="0" stroke="#1F2433" strokeWidth="2" />
               <line x1="50%" y1="0" x2="100%" y2="0" stroke="#1F2433" strokeWidth="2" />
               
               {/* Data flow lines */}
               <line x1="0%" y1="0" x2="50%" y2="0" stroke="#00FFB2" strokeWidth="2" className="dash-flow" opacity="0.6" />
               <line x1="50%" y1="0" x2="100%" y2="0" stroke="#00FFB2" strokeWidth="2" className="dash-flow" opacity="0.6" />
            </svg>

            {/* Step 1 */}
            <div className="group relative bg-[#0F111A]/80 backdrop-blur-md border border-[#1F2433] hover:border-[#00FFB2]/50 p-8 rounded-xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,255,178,0.1)] hover:-translate-y-2">
              <div className="absolute top-0 right-0 p-4 font-display text-6xl text-[#1F2433] group-hover:text-[#1F2433]/80 select-none z-0">01</div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-lg border border-[#00FFB2]/30 bg-[#00FFB2]/10 flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(0,255,178,0.2)]">
                  <Crosshair className="w-6 h-6 text-[#00FFB2]" />
                </div>
                <h3 className="text-xl font-medium text-[#FFFFFF] mb-3 group-hover:text-[#00FFB2] transition-colors">Vision Processing</h3>
                <p className="text-[#888888] leading-relaxed text-sm">
                  YOLOv8 runs on edge CCTV feeds, identifying critical incidents with 92% confidence and filtering noise.
                </p>
                <div className="mt-6 pt-4 border-t border-[#1F2433] font-mono text-[10px] text-[#888888]">
                  LATENCY: {'<'}50ms per frame
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative bg-[#0F111A]/80 backdrop-blur-md border border-[#1F2433] hover:border-[#00FFB2]/50 p-8 rounded-xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,255,178,0.1)] hover:-translate-y-2">
              <div className="absolute top-0 right-0 p-4 font-display text-6xl text-[#1F2433] group-hover:text-[#1F2433]/80 select-none z-0">02</div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-lg border border-[#00FFB2]/30 bg-[#00FFB2]/10 flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(0,255,178,0.2)]">
                  <Network className="w-6 h-6 text-[#00FFB2]" />
                </div>
                <h3 className="text-xl font-medium text-[#FFFFFF] mb-3 group-hover:text-[#00FFB2] transition-colors">Autonomous Dispatch</h3>
                <p className="text-[#888888] leading-relaxed text-sm">
                  FastAPI backend recalculates optimal routing for the nearest available drone, dynamically avoiding no-fly zones.
                </p>
                <div className="mt-6 pt-4 border-t border-[#1F2433] font-mono text-[10px] text-[#888888]">
                  A* PATHFINDING ALGORITHM
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative bg-[#0F111A]/80 backdrop-blur-md border border-[#1F2433] hover:border-[#00FFB2]/50 p-8 rounded-xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,255,178,0.1)] hover:-translate-y-2">
              <div className="absolute top-0 right-0 p-4 font-display text-6xl text-[#1F2433] group-hover:text-[#1F2433]/80 select-none z-0">03</div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-lg border border-[#00FFB2]/30 bg-[#00FFB2]/10 flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(0,255,178,0.2)]">
                  <Activity className="w-6 h-6 text-[#00FFB2]" />
                </div>
                <h3 className="text-xl font-medium text-[#FFFFFF] mb-3 group-hover:text-[#00FFB2] transition-colors">Real-time Telemetry</h3>
                <p className="text-[#888888] leading-relaxed text-sm">
                  Command center ingests 60fps drone telemetry via Server-Sent Events (SSE) and live MJPEG video streams.
                </p>
                <div className="mt-6 pt-4 border-t border-[#1F2433] font-mono text-[10px] text-[#888888]">
                  PROTOCOL: SSE / WebSockets
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>




      {/* ── 6. TECH STACK ── */}
      <section id="technology" className="py-32 bg-[#0F111A] border-b border-[#1F2433]">
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] section-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <TerminalSquare className="text-[#00FFB2] w-6 h-6" />
                <span className="font-mono text-[#00FFB2] text-sm tracking-widest uppercase">System Architecture</span>
              </div>
              <h2 className="font-display text-4xl text-[#FFFFFF] mb-6 tracking-tight">Built for Zero Latency</h2>
              <p className="text-[#888888] text-lg leading-relaxed mb-8 max-w-lg">
                NETRA's architecture is event-driven. The Python/FastAPI backend acts as the central brain, ingesting simulated CCTV feeds, running the YOLOv8 inference, and pushing state directly to the Next.js React frontend via Server-Sent Events.
              </p>
              
              <div className="space-y-6">
                 <div>
                   <h4 className="font-mono text-xs text-[#FFFFFF] mb-3 uppercase tracking-widest border-l-2 border-[#00FFB2] pl-3">Frontend</h4>
                   <div className="flex flex-wrap gap-2">
                     {["Next.js 14", "React", "TypeScript", "TailwindCSS", "Zustand", "Leaflet", "Three.js"].map(badge => (
                       <span key={badge} className="px-3 py-1.5 border border-[#1F2433] bg-[#161A25] text-xs font-mono text-[#888888] hover:border-[#00FFB2] hover:text-[#00FFB2] transition-colors cursor-default">{badge}</span>
                     ))}
                   </div>
                 </div>
                 <div>
                   <h4 className="font-mono text-xs text-[#FFFFFF] mb-3 uppercase tracking-widest border-l-2 border-[#FF3B3B] pl-3">Backend / AI</h4>
                   <div className="flex flex-wrap gap-2">
                     {["Python", "FastAPI", "YOLOv8", "SSE", "WebSockets", "A* Algorithm", "Docker"].map(badge => (
                       <span key={badge} className="px-3 py-1.5 border border-[#1F2433] bg-[#161A25] text-xs font-mono text-[#888888] hover:border-[#FF3B3B] hover:text-[#FF3B3B] transition-colors cursor-default">{badge}</span>
                     ))}
                   </div>
                 </div>
              </div>
            </div>
            
            {/* Terminal Block */}
            <div className="w-full relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00FFB2] to-[#0A0A0F] rounded-lg blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>
              <TerminalLog />
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. PROJECT FOOTER ── */}
      <section className="pt-24 pb-12 bg-[#0A0A0F]">
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] flex flex-col items-center text-center section-content">
          
          <div className="w-16 h-16 bg-[url('/csi-logo.png')] bg-contain bg-center bg-no-repeat mb-6 opacity-80" />
          
          <h2 className="font-display text-4xl text-[#FFFFFF] mb-4 tracking-tight">CSI Hackathon 2026</h2>
          <p className="text-[#888888] font-mono text-sm max-w-xl mx-auto mb-12">
            Built by <strong className="text-[#FFFFFF]">Team Phoenix</strong> from COEP Technological University. A hackathon project focusing on real-time emergency response using drones and edge computing.
          </p>
          
          <div className="flex gap-4 mb-24">
            <Link
              href="https://github.com/ShubhamGarje99/netra"
              target="_blank"
              className="px-6 py-3 border border-[#1F2433] bg-[#161A25] text-[#FFFFFF] font-mono text-xs tracking-widest uppercase transition-colors hover:bg-[#1F2433] flex items-center gap-2"
            >
              <Github className="w-4 h-4" /> Source Code
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 border border-[#00FFB2] text-[#00FFB2] bg-[#00FFB2]/5 font-mono text-xs tracking-widest uppercase transition-colors hover:bg-[#00FFB2]/20 flex items-center gap-2"
            >
               Open Application
            </Link>
          </div>

          <div className="w-full border-t border-[#1F2433] pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#00FFB2] rounded-sm" />
              <div className="font-mono text-sm tracking-widest text-[#FFFFFF] font-bold">NETRA</div>
            </div>
            <div className="font-mono text-[#888888] text-[10px] uppercase tracking-widest opacity-50">
              MIT License · © {currentYear} Team Phoenix
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

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

const MapPanel = dynamic(
  () => import("@/dashboard/MapPanel").then((mod) => mod.MapPanel),
  { ssr: false }
);

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
    <main className="bg-void text-signal font-sans">
      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-50 border-b border-[#1F2433] bg-[#0A0A0F]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 md:px-12 py-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#00FFB2] rounded-sm" />
            <div className="font-mono text-sm tracking-widest text-[#FFFFFF]">NETRA</div>
          </div>
          <div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-wider text-[#888888]">
            <button type="button" onClick={() => scrollToId("system")} className="hover:text-[#FFFFFF] transition-colors">System</button>
            <button type="button" onClick={() => scrollToId("dashboard")} className="hover:text-[#FFFFFF] transition-colors">Dashboard</button>
            <button type="button" onClick={() => scrollToId("technology")} className="hover:text-[#FFFFFF] transition-colors">Technology</button>
            <button type="button" onClick={() => scrollToId("deploy")} className="hover:text-[#FFFFFF] transition-colors">Deploy</button>
          </div>
          <Link
            href="/dashboard"
            className="border border-[#00FFB2] px-4 py-2 font-mono text-xs tracking-wider text-[#00FFB2] transition-colors hover:bg-[#00FFB2]/10"
          >
            Get Access
          </Link>
        </div>
      </header>

      {/* ── 1. HERO ── */}
      <section className="relative min-h-[calc(100vh-65px)] flex flex-col justify-center overflow-hidden border-b border-[#1F2433]">
        {/* Subtle Map Background overlay */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none grayscale contrast-125 mix-blend-screen">
            <MapPanel />
        </div>
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0A0A0F]/60 via-[#0A0A0F]/80 to-[#0A0A0F]" />
        
        <div className="container relative z-10 mx-auto px-6 md:px-12 max-w-[1440px] text-center pt-20 pb-32 flex-1 flex flex-col justify-center">
          <div className="mb-6 inline-block font-mono text-xs tracking-[0.2em] text-[#888888]">
            [ AUTONOMOUS RESPONSE SYSTEM ]
          </div>
          <h1 className="font-display text-5xl md:text-[96px] leading-[0.88] tracking-[-0.04em] text-[#FFFFFF] max-w-5xl mx-auto mb-8">
            The city sees everything.<br />Now it can respond.
          </h1>
          <p className="text-lg md:text-xl text-[#888888] max-w-2xl mx-auto mb-12 leading-relaxed">
            NETRA deploys AI drones in seconds, resolving critical incidents before human operators can even pick up the phone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-[#00FFB2] text-[#0A0A0F] font-mono font-bold text-sm tracking-widest uppercase transition-transform hover:scale-[0.98]"
            >
              Request Access
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 border border-[#1F2433] text-[#FFFFFF] font-mono text-sm tracking-widest uppercase transition-colors hover:bg-[#161A25]"
            >
              Watch Live Demo
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
        `}} />
      </section>

      {/* ── 2. LIVE SYSTEM STATUS BAR ── */}
      <section id="system" className="border-b border-[#1F2433] bg-[#0F111A]">
        <div className="mx-auto max-w-[1440px] h-[120px] grid grid-cols-2 md:grid-cols-4 divide-x divide-[#1F2433]">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AnimatedCounter value={totalIncidentsDetected} />
            <div className="font-mono text-xs text-[#888888] tracking-widest mt-2 uppercase">Incidents Detected</div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AnimatedCounter value={dronesDeployed} />
            <div className="font-mono text-xs text-[#888888] tracking-widest mt-2 uppercase">Drones Deployed</div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AnimatedCounter value={responseTimeMin} decimals={1} suffix="m" />
            <div className="font-mono text-xs text-[#888888] tracking-widest mt-2 uppercase">Avg Response Time</div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AnimatedCounter value={coverageKmSq} decimals={1} suffix=" km²" />
            <div className="font-mono text-xs text-[#888888] tracking-widest mt-2 uppercase">Coverage Area</div>
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ── */}
      <section className="py-32 relative border-b border-[#1F2433] bg-[#0A0A0F]">
        {/* Subtle dot grid bg */}
        <div className="absolute inset-0 bg-[radial-gradient(#1F2433_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
        
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            
            <div className="relative group section-content">
              <div className="font-mono text-xs text-[#00FFB2] tracking-widest mb-6">01</div>
              <div className="w-12 h-12 border border-[#1F2433] bg-[#161A25] flex items-center justify-center mb-6">
                <Crosshair className="w-5 h-5 text-[#888888] group-hover:text-[#FFFFFF] transition-colors" />
              </div>
              <h3 className="text-xl font-medium text-[#FFFFFF] mb-3">Detection</h3>
              <p className="text-[#888888] leading-relaxed text-sm max-w-sm">
                Computer vision identifies incidents across CCTV feeds in real time, filtering noise with high precision.
              </p>
              {/* Connector */}
              <div className="hidden md:block absolute top-[44px] left-[60px] right-[-30px] h-px bg-[#1F2433]" />
            </div>

            <div className="relative group section-content">
              <div className="font-mono text-xs text-[#00FFB2] tracking-widest mb-6">02</div>
              <div className="w-12 h-12 border border-[#1F2433] bg-[#161A25] flex items-center justify-center mb-6">
                <Activity className="w-5 h-5 text-[#888888] group-hover:text-[#FFFFFF] transition-colors" />
              </div>
              <h3 className="text-xl font-medium text-[#FFFFFF] mb-3">Dispatch</h3>
              <p className="text-[#888888] leading-relaxed text-sm max-w-sm">
                The nearest available drone is autonomously assigned and routed, dynamically avoiding no-fly zones.
              </p>
              {/* Connector */}
              <div className="hidden md:block absolute top-[44px] left-[60px] right-[-30px] h-px bg-[#1F2433]" />
            </div>

            <div className="relative group section-content">
              <div className="font-mono text-xs text-[#00FFB2] tracking-widest mb-6">03</div>
              <div className="w-12 h-12 border border-[#1F2433] bg-[#161A25] flex items-center justify-center mb-6">
                <ShieldAlert className="w-5 h-5 text-[#888888] group-hover:text-[#FFFFFF] transition-colors" />
              </div>
              <h3 className="text-xl font-medium text-[#FFFFFF] mb-3">Resolution</h3>
              <p className="text-[#888888] leading-relaxed text-sm max-w-sm">
                Live feed, telemetry, and on-scene response—all securely logged and managed autonomously.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. DASHBOARD SHOWCASE ── */}
      <section id="dashboard" className="py-32 bg-[#0F111A] border-b border-[#1F2433] overflow-hidden">
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] text-center section-content">
          <h2 className="font-display text-4xl md:text-5xl text-[#FFFFFF] mb-20 tracking-tight">
            Full situational awareness. Zero delay.
          </h2>
          
          <div className="relative w-full max-w-[1200px] mx-auto">
            {/* Ambient Glow */}
            <div className="absolute inset-x-20 inset-y-10 bg-[#00FFB2]/5 blur-[120px] pointer-events-none" />
            
            {/* Browser Mockup */}
            <div className="relative border border-[#1F2433] rounded-lg bg-[#0A0A0F] shadow-2xl overflow-hidden aspect-video">
              <div className="h-8 border-b border-[#1F2433] bg-[#161A25] flex items-center px-4 gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1F2433]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#1F2433]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#1F2433]" />
              </div>
              <div className="w-full h-[calc(100%-32px)] relative">
                {/* Fallback mockup representation utilizing real components */}
                <div className="absolute inset-0 z-0 pointer-events-none w-full h-full">
                    <MapPanel />
                </div>
                <div className="absolute inset-0 bg-[#0A0A0F]/20 pointer-events-none z-10" />
              </div>
            </div>

            {/* Floating Glass Cards */}
            <div className="absolute -left-8 top-16 w-64 p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl hidden md:block z-20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-[#FF3B3B] animate-pulse rounded-full" />
                <span className="font-mono text-[10px] text-[#888888] tracking-widest uppercase">Live Alert</span>
              </div>
              <div className="font-mono text-sm text-[#FFFFFF] mb-1 drop-shadow-md">Unauthorized Entry</div>
              <div className="font-mono text-[10px] text-[#888888]">Sector 4 • 18.531N, 73.844E</div>
            </div>

            <div className="absolute -right-12 top-1/3 w-56 p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl hidden lg:block z-20">
              <div className="font-mono text-[10px] text-[#888888] tracking-widest uppercase mb-1">Time to Target</div>
              <div className="font-display text-4xl text-[#00FFB2] mb-1 drop-shadow-md">1.2<span className="text-lg text-[#888888] font-sans ml-1">min</span></div>
              <div className="w-full h-1 bg-[#1F2433] rounded-full overflow-hidden mt-3">
                <div className="h-full bg-[#00FFB2] w-[80%]" />
              </div>
            </div>

            <div className="absolute left-12 -bottom-10 w-72 h-40 rounded-xl border border-white/5 bg-[#161A25] shadow-2xl hidden md:block overflow-hidden z-20 border-l-4 border-l-[#00FFB2] p-4">
              <div className="font-mono text-[10px] text-[#888888] tracking-widest mb-3 uppercase">Unit 04 · Gimbal Feed</div>
              <div className="w-full h-[88px] bg-black relative flex items-center justify-center border border-[#1F2433]">
                <Crosshair className="w-6 h-6 text-[#00FFB2]/40" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,178,0.05)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. 3D DRONE SECTION ── */}
      <section className="py-32 bg-[#0A0A0F] border-b border-[#1F2433] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,178,0.08)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] section-content">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl text-[#FFFFFF] tracking-tight">Built for real deployment</h2>
          </div>
          
          <div className="relative h-[600px] w-full flex items-center justify-center">
            {/* The 3D Drone Component */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <Drone3D />
            </div>

            {/* Spec Callouts - Positioning conceptually around the center Drone3D */}
            <div className="relative w-full max-w-[900px] h-full">
               <div className="absolute top-[20%] left-0 md:left-[10%] text-left z-20">
                 <div className="font-mono text-xs text-[#00FFB2] tracking-widest mb-1 uppercase">Optics</div>
                 <div className="text-sm text-[#FFFFFF] mb-1">Gimbal Camera</div>
                 <div className="text-[11px] text-[#888888]">30x Hybrid Zoom</div>
                 <svg className="absolute left-[120%] top-1/2 w-32 h-px hidden md:block" overflow="visible"><line x1="0" y1="0" x2="100" y2="20" stroke="#1F2433" /></svg>
               </div>

               <div className="absolute top-[20%] right-0 md:right-[10%] text-right z-20">
                 <div className="font-mono text-xs text-[#00FFB2] tracking-widest mb-1 uppercase">Comms</div>
                 <div className="text-sm text-[#FFFFFF] mb-1">4G / LTE + GPS</div>
                 <div className="text-[11px] text-[#888888]">Redundant fallbacks</div>
                 <svg className="absolute right-[120%] top-1/2 w-32 h-px hidden md:block" overflow="visible"><line x1="100" y1="0" x2="0" y2="40" stroke="#1F2433" /></svg>
               </div>

               <div className="absolute bottom-[25%] left-0 md:left-[15%] text-left z-20">
                 <div className="font-mono text-xs text-[#00FFB2] tracking-widest mb-1 uppercase">Endurance</div>
                 <div className="text-sm text-[#FFFFFF] mb-1">40 min flight time</div>
                 <div className="text-[11px] text-[#888888]">Hot-swappable cells</div>
                 <svg className="absolute left-[120%] bottom-1/2 w-24 h-px hidden md:block" overflow="visible"><line x1="0" y1="0" x2="100" y2="-40" stroke="#1F2433" /></svg>
               </div>

               <div className="absolute bottom-[25%] right-0 md:right-[15%] text-right z-20">
                 <div className="font-mono text-xs text-[#00FFB2] tracking-widest mb-1 uppercase">Durability</div>
                 <div className="text-sm text-[#FFFFFF] mb-1">Wind resistant</div>
                 <div className="text-[11px] text-[#888888]">Up to 15 m/s</div>
                 <svg className="absolute right-[120%] bottom-1/2 w-32 h-px hidden md:block" overflow="visible"><line x1="100" y1="0" x2="0" y2="-20" stroke="#1F2433" /></svg>
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
              <h2 className="font-display text-4xl text-[#FFFFFF] mb-6 tracking-tight">Intelligence at the Edge</h2>
              <p className="text-[#888888] text-lg leading-relaxed mb-8 max-w-lg">
                NETRA's architecture is built for zero-latency operations. It processes raw CCTV feeds using YOLOv8, maps detections to coordinates, and broadcasts dispatch payloads via Server-Sent Events—all within milliseconds.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Next.js", "TypeScript", "Python", "YOLOv8", "Leaflet", "Zustand", "FastAPI", "SSE"].map(badge => (
                  <span key={badge} className="px-3 py-1 border border-[#1F2433] bg-[#161A25] text-xs font-mono text-[#888888]">{badge}</span>
                ))}
              </div>
            </div>
            
            {/* Terminal Block */}
            <div className="w-full">
              <TerminalLog />
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. SOCIAL PROOF ── */}
      <section className="py-32 bg-[#0A0A0F] border-b border-[#1F2433]">
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] section-content">
          <div className="bg-[#0F111A] border border-[#1F2433] p-12 lg:p-20 grid grid-cols-1 md:grid-cols-3 gap-12 divide-y md:divide-y-0 md:divide-x divide-[#1F2433]">
            <div className="flex flex-col md:items-center text-center">
              <div className="font-display text-5xl md:text-6xl text-[#FFFFFF] mb-4 tracking-[-0.04em]">{"<"} 8s</div>
              <div className="font-mono text-xs tracking-widest text-[#00FFB2] uppercase mb-2">Dispatch Time</div>
              <div className="text-sm text-[#888888]">From detection to drone liftoff</div>
            </div>
            <div className="flex flex-col md:items-center text-center pt-12 md:pt-0">
              <div className="font-display text-5xl md:text-6xl text-[#FFFFFF] mb-4 tracking-[-0.04em]">92%</div>
              <div className="font-mono text-xs tracking-widest text-[#00FFB2] uppercase mb-2">Detection Accuracy</div>
              <div className="text-sm text-[#888888]">Computer vision confident models</div>
            </div>
            <div className="flex flex-col md:items-center text-center pt-12 md:pt-0">
              <div className="font-display text-5xl md:text-6xl text-[#FFFFFF] mb-4 tracking-[-0.04em]">24/7</div>
              <div className="font-mono text-xs tracking-widest text-[#00FFB2] uppercase mb-2">Autonomous Operation</div>
              <div className="text-sm text-[#888888]">Uninterrupted city-wide watch</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. CTA FOOTER ── */}
      <section id="deploy" className="pt-32 pb-12 bg-[#0F111A]">
        <div className="container mx-auto px-6 md:px-12 max-w-[1440px] flex flex-col items-center section-content">
          <h2 className="font-display text-4xl md:text-5xl text-[#FFFFFF] mb-12 tracking-tight">Deploy NETRA in your city.</h2>
          
          <form className="w-full max-w-md flex flex-col sm:flex-row gap-3 mb-32" onSubmit={e => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="operator@citygov.org" 
              className="flex-1 bg-[#0A0A0F] border border-[#1F2433] px-4 py-3 text-sm text-[#FFFFFF] font-mono focus:outline-none focus:border-[#00FFB2] transition-colors"
            />
            <button 
              type="submit" 
              className="bg-[#00FFB2] text-[#0A0A0F] font-mono font-bold text-sm px-6 py-3 tracking-widest uppercase transition-transform hover:scale-[0.98] flex items-center justify-center gap-2"
            >
              Request <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="w-full border-t border-[#1F2433] pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="font-mono text-[#888888] text-[11px] uppercase tracking-widest">
              Built by Team Phoenix · COEP Technological University · CSI Hackathon 2025
            </div>
            <div className="font-mono text-[#888888] text-[11px] uppercase tracking-widest opacity-50">
              © {currentYear} NETRA Systems
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

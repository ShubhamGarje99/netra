"use client";

import { useEffect, useRef, useState } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

export function AnimatedCounter({ 
  value, 
  prefix = "", 
  suffix = "", 
  decimals = 0 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  decimals?: number 
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const isVisible = useIntersectionObserver(containerRef, { threshold: 0.1 });

  useEffect(() => {
    if (isVisible && !hasAnimated) {
      setHasAnimated(true);
      
      const duration = 1500;
      const start = performance.now();
      
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // easeOutQuart
        const ease = 1 - Math.pow(1 - progress, 4);
        
        setDisplayValue(value * ease);
        
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setDisplayValue(value);
        }
      };
      
      requestAnimationFrame(step);
    }
  }, [isVisible, hasAnimated, value]);

  // Update without animation if value changes after initial animation
  useEffect(() => {
    if (hasAnimated) {
      setDisplayValue(value);
    }
  }, [value, hasAnimated]);

  const formatted = displayValue.toFixed(decimals);

  return (
    <div ref={containerRef} className="font-display font-medium text-4xl text-[#FFFFFF] tracking-tight">
      {prefix}{formatted}{suffix}
    </div>
  );
}

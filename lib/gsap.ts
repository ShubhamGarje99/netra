/**
 * GSAP Registration Module
 * Central place for all GSAP plugin registration.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
gsap.config({ nullTargetWarn: false });

export { gsap, ScrollTrigger };

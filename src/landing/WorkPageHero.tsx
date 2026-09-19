"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ---------------------------------------------------------------------------
// Types & Defaults
// ---------------------------------------------------------------------------
export interface LiveCount {
  value: number;
  label: string;
}

export interface WorkPageHeroProps {
  /**
   * Video source URL. Supports direct video files (.mp4, .webm, cdn streams)
   * or iframe embeds (Cloudinary player, Vimeo, YouTube).
   * Leave undefined to render the animated gradient placeholder instead.
   */
  videoSrc?: string;
  /** Video poster / thumbnail image URL */
  poster?: string;
  /** Explicitly set video rendering mode, or auto-detect based on URL */
  videoType?: "auto" | "video" | "iframe";
  /** Top overlay word (default: "reporting") */
  topWord?: string;
  /** Right side overlay word (default: "your") */
  rightWord?: string;
  /** Bottom overlay word (default: "commute") */
  bottomWord?: string;
  /** Accent color for highlighted text and live counts (default: SafeRoute amber) */
  accentColor?: string;
  /** Secondary text color (default: SafeRoute deep navy) */
  textColor?: string;
  /** Background color of the hero viewport (default: SafeRoute pale blue) */
  backgroundColor?: string;
  /** Whether to display the live hazard counters */
  showCounts?: boolean;
  /** Live counts displayed in place of the old world clocks */
  counts?: LiveCount[];
  /** GSAP ScrollTrigger end scroll distance (default: "+=150%") */
  scrollDistance?: string;
  /** Additional container CSS classes */
  className?: string;
}

const DEFAULT_COUNTS: LiveCount[] = [
  { value: 1428, label: "HAZARDS LOGGED" },
  { value: 42, label: "WARDS ACTIVE" },
];

// SafeRoute palette
const ACCENT = "#ffb955";
const ACCENT_DEEP = "#dd9202";
const NAVY = "#03224d";
const NAVY_PRIMARY = "#1f3864";
const PALE_BG = "#f4f7ff";

/** Subtle looping gradient used until a real hero video asset is provided. */
const PLACEHOLDER_GRADIENT = `linear-gradient(135deg, #03224d 0%, #1f3864 45%, #0e1b33 100%)`;

// ---------------------------------------------------------------------------
// Helper – Count-up animation for the live hazard counters
// ---------------------------------------------------------------------------
function useCountUp(target: number, duration = 1600) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased).toLocaleString("en-IN"));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

function LiveCountRow({ count, textColor }: { count: LiveCount; textColor: string; key?: React.Key }) {
  const value = useCountUp(count.value);
  return (
    <div className="flex items-center gap-[clamp(0.5rem,1.2vw,1.5rem)] font-medium">
      <span className="tabular-nums font-semibold">{value}</span>
      <span style={{ color: textColor }}>{count.label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component – WorkPageHero / ScrollExpandHero (SafeRoute edition)
// ---------------------------------------------------------------------------
export const WorkPageHero: React.FC<WorkPageHeroProps> = ({
  videoSrc,
  poster,
  videoType = "auto",
  topWord = "reporting",
  rightWord = "your",
  bottomWord = "commute",
  accentColor = ACCENT,
  textColor = NAVY,
  backgroundColor = PALE_BG,
  showCounts = true,
  counts = DEFAULT_COUNTS,
  scrollDistance = "+=150%",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const textGroupRef = useRef<HTMLDivElement>(null);

  // Determine if source is an iframe embed or direct HTML5 video
  const isDirectVideo =
    videoType === "video" ||
    (videoType === "auto" &&
      !!videoSrc &&
      !videoSrc.includes("player.cloudinary.com") &&
      !videoSrc.includes("youtube.com") &&
      !videoSrc.includes("vimeo.com") &&
      /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(videoSrc));

  useGSAP(
    () => {
      if (!containerRef.current || !videoWrapperRef.current || !textGroupRef.current) {
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: scrollDistance,
          scrub: true,
          pin: true,
        },
      });

      tl.to(
        videoWrapperRef.current,
        {
          top: "0%",
          left: "0%",
          bottom: "0%",
          right: "0%",
          borderRadius: "0rem",
          ease: "none",
        },
        0
      ).to(
        textGroupRef.current,
        {
          opacity: 0,
          scale: 1.15,
          filter: "blur(12px)",
          ease: "none",
        },
        0
      );
    },
    { scope: containerRef, dependencies: [scrollDistance] }
  );

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ background: backgroundColor }}
    >
      <section
        ref={containerRef}
        className="relative h-screen min-h-[520px] w-full overflow-hidden select-none"
      >
        {/* ── Animated Kinetic Typography Overlay ── */}
        <div
          ref={textGroupRef}
          className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between"
          style={{ willChange: "transform, opacity, filter" }}
        >
          {/* Top Word */}
          <div className="absolute top-[2%] inset-x-0 flex justify-center">
            <span
              className="font-black tracking-tighter leading-none select-none text-center"
              style={{
                color: accentColor,
                fontSize: "clamp(3.5rem, 11vw, 11rem)",
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              {topWord}
            </span>
          </div>

          {/* Right Word */}
          <div className="absolute right-[3%] top-[38%] flex items-center">
            <span
              className="font-black tracking-tighter leading-none select-none"
              style={{
                color: textColor,
                fontSize: "clamp(3.5rem, 11vw, 11rem)",
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              {rightWord}
            </span>
          </div>

          {/* Bottom Word (Serif / Editorial) */}
          <div className="absolute bottom-[2%] inset-x-0 flex justify-center">
            <span
              className="font-normal italic leading-none select-none text-center"
              style={{
                color: accentColor,
                fontSize: "clamp(4rem, 14vw, 13rem)",
                fontFamily: "Georgia, 'Times New Roman', Cambria, serif",
              }}
            >
              {bottomWord}
            </span>
          </div>

          {/* ── Live Hazard Counts Column (replaces the old world clocks) ── */}
          {showCounts && counts.length > 0 && (
            <div
              className="absolute left-[clamp(1.25rem,4vw,5rem)] top-1/2 -translate-y-1/2 flex flex-col gap-3 font-mono text-[clamp(9px,1.1vw,12px)] uppercase tracking-[0.15em] opacity-90"
              style={{ color: accentColor }}
            >
              {counts.map((count) => (
                <LiveCountRow key={count.label} count={count} textColor={textColor} />
              ))}
            </div>
          )}
        </div>

        {/* ── Center Expanding Media Pill ── */}
        <div
          ref={videoWrapperRef}
          className="absolute z-20 overflow-hidden shadow-2xl transition-[border-radius]"
          style={{
            top: "18%",
            bottom: "18%",
            left: "22%",
            right: "18%",
            borderRadius: "0.75rem",
            willChange: "top, left, right, bottom, border-radius",
          }}
        >
          {videoSrc ? (
            isDirectVideo ? (
              <video
                src={videoSrc}
                poster={poster}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <iframe
                src={videoSrc}
                title="SafeRoute hero reel"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-none block"
              />
            )
          ) : (
            /* Animated gradient placeholder until a real video asset is added */
            <div
              className="w-full h-full"
              style={{
                background: PLACEHOLDER_GRADIENT,
                backgroundSize: "200% 200%",
                animation: "heroGradientDrift 14s ease-in-out infinite",
              }}
            >
              {/* faint road-grid texture, echoing the stats section backdrop */}
              <div
                className="w-full h-full opacity-[0.08]"
                style={{
                  backgroundImage:
                    "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }}
              />
              <div
                className="absolute bottom-6 left-6 md:bottom-10 md:left-10 flex items-center gap-2 text-white/70 text-xs md:text-sm font-medium tracking-wide uppercase"
                style={{ color: "#d8e2ff" }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: accentColor }}
                />
                Live hazard telemetry — Bengaluru
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Gradient keyframes for the placeholder (no video asset yet) */}
      <style>{`
        @keyframes heroGradientDrift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default WorkPageHero;

"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { Bike } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// Pinned, scroll-scrubbed sensor-detection scene (GSAP ScrollTrigger, same
// pin + scrub pattern as the hero).
//
// The card pins at viewport center while a bike rides the road profile:
// flat → speed-breaker bump → flat → pothole dip → rise to exit.
// ONE scrubbed timeline drives everything in sync:
//   - bike position along the road (MotionPathPlugin, auto-rotated to slope)
//   - accelerometer waveform drawing underneath
//   - GYRO: readout cycling  — / SPEED BREAKER / — / POTHOLE / —
// Nothing runs on a timer; scrubbing back rewinds the whole scene.
// ---------------------------------------------------------------------------

/** Road surface: the exact profile from the spec (viewBox 0 0 1000 300). */
const ROAD_PATH =
  "M0,200 L200,195 C230,150 280,140 320,140 C360,140 400,150 420,195 " +
  "L600,200 C620,200 630,195 640,190 C650,185 660,230 680,235 " +
  "C700,240 710,200 730,195 L1000,150";

/**
 * Accelerometer trace under the road: flat sensor noise, a smooth rounded
 * spike under the breaker (~x325) and a sharp jagged spike under the
 * pothole (~x660-700). Drawn left-to-right via stroke-dashoffset.
 */
const WAVE_PATH =
  "M0,55 " +
  "l28,-2 l24,2 l30,-3 l26,3 l28,-2 l26,2 l28,-3 l30,3 " +
  "C260,45 295,12 325,12 C355,12 395,45 425,52 " +
  "l28,2 l26,-2 l30,2 l35,-1 l30,2 l26,-2 " +
  "l14,8 l8,-42 l10,52 l8,-44 l12,32 " +
  "l28,-2 l30,2 l26,-1 l30,2 l30,-2 l28,1 l34,-2 l30,2 l40,-1 l20,1";

/** GYRO readout windows, mapped to arc-length progress along the road. */
function gyroLabelFor(progress: number): string {
  if (progress < 0.19) return "—";
  if (progress < 0.42) return "SPEED BREAKER";
  if (progress < 0.58) return "—";
  if (progress < 0.76) return "POTHOLE";
  return "—";
}

function HazardDetectionScene() {
  const cardRef = useRef<HTMLDivElement>(null);
  const roadRef = useRef<SVGPathElement>(null);
  const bikeRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<SVGPathElement>(null);
  const gyroRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const road = roadRef.current;
      const bike = bikeRef.current;
      const wave = waveRef.current;
      if (!cardRef.current || !road || !bike || !wave) return;

      // Waveform starts fully hidden and draws left→right with the bike
      const waveLength = wave.getTotalLength();
      gsap.set(wave, {
        strokeDasharray: waveLength,
        strokeDashoffset: waveLength,
      });

      // One pinned, scrubbed timeline: scroll = progress
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: cardRef.current,
          start: "center center", // pin once the card is centered
          end: "+=160%", // ride lasts ~1.6x card height of scrolling
          pin: true, // page holds until the bike finishes the road
          scrub: true, // exact 1:1 sync with scroll position
          anticipatePin: 1,
          invalidateOnRefresh: true, // recompute path geometry on resize
        },
      });

      // Bike rides the road, tilted to follow the slope
      tl.to(
        bike,
        {
          motionPath: {
            path: road,
            align: road,
            alignOrigin: [0.5, 1], // wheels stay on the road line
            autoRotate: true, // rise into the bump, dip into the pothole
          },
          ease: "none",
          duration: 1,
        },
        0
      );

      // Waveform draws in the same window — perfectly synced, never on a timer
      tl.to(wave, { strokeDashoffset: 0, ease: "none", duration: 1 }, 0);

      // GYRO readout from the same scrubbed progress
      tl.eventCallback("onUpdate", () => {
        if (gyroRef.current) {
          gyroRef.current.textContent = gyroLabelFor(tl.progress());
        }
      });
    },
    { scope: cardRef }
  );

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden rounded-3xl bg-[#1f3864] p-8 flex flex-col justify-between min-h-[300px]"
    >
      <div
        className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #ffb955, transparent 70%)" }}
      />
      <div className="relative">
        <h3 className="text-2xl font-semibold text-white mb-3">
          Sensor-based hazard detection
        </h3>
        <p className="text-[#afc6fb] leading-relaxed max-w-md">
          Your phone's accelerometer and gyroscope flag likely potholes
          mid-ride, then ask you to confirm with one tap — no camera,
          no extra step.
        </p>
      </div>

      {/* ── Pinned scroll-scrubbed scene ── */}
      <div className="relative mt-6 select-none">
        {/* GYRO readout */}
        <div className="absolute -top-1 right-0 z-10 flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] text-[#afc6fb]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffb955] animate-pulse" />
          GYRO:&nbsp;
          <span ref={gyroRef} className="text-[#ffb955] font-semibold">
            —
          </span>
        </div>

        {/* Road profile (also the motion path) */}
        <svg viewBox="0 0 1000 300" className="w-full h-auto" aria-hidden="true">
          <path
            ref={roadRef}
            d={ROAD_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Bike riding the road (positioned by MotionPathPlugin) */}
        <div
          ref={bikeRef}
          className="absolute top-0 left-0 z-10 will-change-transform drop-shadow-[0_3px_8px_rgba(255,185,85,0.5)]"
        >
          <Bike size={38} strokeWidth={2.4} className="text-[#ffb955]" />
        </div>

        {/* Accelerometer waveform, drawing with the bike's progress */}
        <svg viewBox="0 0 1000 90" className="w-full h-auto -mt-2" aria-hidden="true">
          <path
            d={WAVE_PATH}
            fill="none"
            stroke="rgba(255,185,85,0.18)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            ref={waveRef}
            d={WAVE_PATH}
            fill="none"
            stroke="#ffb955"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section className="bg-[#f9f9ff] py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          variants={fadeUp}
          className="max-w-xl mb-12"
        >
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-[#03224d] leading-[1.1]">
            One ride, mapped in real time
          </h2>
          <p className="mt-4 text-[#545f72] text-lg leading-relaxed">
            SafeRoute turns a normal commute into live civic data — no extra
            hardware, no separate app to remember.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Large card: pinned GSAP scene — wrapped so the pin-spacer
              never becomes a grid child itself */}
          <div className="md:col-span-4">
            <HazardDetectionScene />
          </div>

          {/* Right column: small cards */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              variants={fadeUp}
              className="rounded-3xl bg-white border border-[#dde2f3] p-6 flex flex-col justify-between"
            >
              <h3 className="text-lg font-semibold text-[#03224d]">
                Ask it about your route
              </h3>
              <p className="mt-2 text-sm text-[#545f72] leading-relaxed">
                "Which road to college has fewer reports this week?" — answered
                from live hazard data, not a script.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              variants={fadeUp}
              className="rounded-3xl bg-white border border-[#dde2f3] p-6 flex flex-col justify-between"
            >
              <h3 className="text-lg font-semibold text-[#03224d]">
                A dashboard for the ward, not just the rider
              </h3>
              <p className="mt-2 text-sm text-[#545f72] leading-relaxed">
                Filter reports by road, severity, and week — the same view a
                civic body would use to decide what gets fixed first.
              </p>
            </motion.div>
          </div>

          {/* Wide card: crowdsourced network */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            variants={fadeUp}
            className="md:col-span-6 rounded-3xl bg-gradient-to-r from-[#d5e0f7] to-[#f1f3ff] p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          >
            <div>
              <h3 className="text-xl font-semibold text-[#03224d]">
                Built from rides people already take
              </h3>
              <p className="mt-2 text-[#44474f] leading-relaxed max-w-md">
                No dedicated reporting trip needed — hazards get logged as
                part of a normal commute, so the map fills in on its own.
              </p>
            </div>
            <div className="flex -space-x-3 shrink-0">
              {["#1f3864", "#dd9202", "#545f72", "#03224d"].map((c, i) => (
                <div
                  key={i}
                  className="w-11 h-11 rounded-full border-2 border-[#f9f9ff]"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

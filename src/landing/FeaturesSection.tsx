"use client";

import React, { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import LOGO_URL from "../../saferoute-logo.svg";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// Scroll-driven sensor-detection animation
//
// A rider icon (SafeRoute logo) crosses a road containing a speed breaker
// (smooth bump ~1/3 along) and a pothole (jagged dip ~2/3 along). Everything
// is bound to the card's scroll progress — nothing autoplays on a timer.
// ---------------------------------------------------------------------------
const BREAKER_X = 32; // % along the road where the speed breaker sits
const POTHOLE_X = 66; // % along the road where the pothole sits

/** SVG path for the road surface: breaker bump at BREAKER_X, pothole dip at POTHOLE_X. */
const ROAD_PATH =
  "M0 40 " +
  // approach to the breaker
  `C ${BREAKER_X - 9} 40, ${BREAKER_X - 7} 32, ${BREAKER_X - 4} 32 ` +
  // breaker bump (rounded) and back down
  `C ${BREAKER_X - 1} 32, ${BREAKER_X - 1} 40, ${BREAKER_X + 2} 40 ` +
  `C ${BREAKER_X + 5} 40, ${BREAKER_X + 7} 32, ${BREAKER_X + 10} 32 ` +
  // dip into the pothole (jagged)
  `L ${POTHOLE_X - 5} 40 ` +
  `L ${POTHOLE_X - 2} 52 L ${POTHOLE_X + 1} 44 L ${POTHOLE_X + 3} 54 L ${POTHOLE_X + 6} 40 ` +
  // ride out
  "L 100 40";

/**
 * A small mostly-flat noisy waveform whose amplitude envelope is flat except
 * for a smooth bump centered at the breaker and a sharp spike at the pothole.
 * Drawn via stroke-dashoffset bound to scroll progress.
 */
const WAVE_PATH =
  "M0 30 " +
  // gentle sensor noise
  "l 6 -3 l 5 3 l 6 -2 l 5 2 " +
  // smooth rise/fall over the speed breaker
  `c 4 -6, 9 -6, 12 0 ` +
  // flat again
  "l 6 2 l 5 -3 l 6 3 l 5 -2 " +
  // sharp double-jolt at the pothole
  "l 3 -12 l 3 14 l 3 -16 l 4 14 " +
  // settle back to noise
  "l 6 -2 l 5 3 l 6 -2 l 5 2 l 6 -1";

function HazardDetectionChart() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll progress through this card's section (not the whole page)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.9", "end 0.45"],
  });

  // Rider travels the full road width across the first 80% of the scroll
  const riderX = useTransform(scrollYProgress, [0, 0.8], ["0%", "100%"]);

  // Waveform draws in sync with the rider's position
  const waveLength = useTransform(scrollYProgress, [0, 0.8], [340, 0]);
  const waveOffset = useTransform(waveLength, (l) => l);

  // Detection chips: fade/hold/fade windows tied to when the rider crosses
  const breakerOpacity = useTransform(
    scrollYProgress,
    [0.22, 0.3, 0.5, 0.6],
    [0, 1, 1, 0]
  );
  const breakerY = useTransform(scrollYProgress, [0.22, 0.3], [8, 0]);
  const potholeOpacity = useTransform(
    scrollYProgress,
    [0.52, 0.6, 0.78, 0.88],
    [0, 1, 1, 0]
  );
  const potholeY = useTransform(scrollYProgress, [0.52, 0.6], [8, 0]);

  // Sensor status text cycles with progress (rendered via state so it
  // updates on scroll without re-rendering the whole chart every frame)
  const [statusText, setStatusText] = useState("listening…");
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (p < 0.24) setStatusText("listening…");
    else if (p < 0.5) setStatusText("speed breaker");
    else if (p < 0.74) setStatusText("listening…");
    else if (p < 0.92) setStatusText("pothole");
    else setStatusText("logged ✓");
  });

  return (
    <div
      ref={containerRef}
      className="relative flex items-end gap-1 h-16 mt-8 select-none"
    >
      {/* ── Detection chips ── */}
      <motion.div
        style={{ left: `${BREAKER_X - 9}%`, opacity: breakerOpacity, y: breakerY }}
        className="absolute -top-7 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#ffb955] text-[#1a202c] text-[10px] font-semibold whitespace-nowrap shadow-md"
      >
        Speed Breaker detected
      </motion.div>
      <motion.div
        style={{ left: `${POTHOLE_X - 3}%`, opacity: potholeOpacity, y: potholeY }}
        className="absolute -top-7 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#dd9202] text-white text-[10px] font-semibold whitespace-nowrap shadow-md"
      >
        Pothole detected
      </motion.div>

      {/* ── Rider icon (SafeRoute pin), moving with scroll ── */}
      <motion.img
        src={LOGO_URL}
        alt=""
        aria-hidden="true"
        style={{ left: riderX, x: "-50%" }}
        className="absolute -top-[30px] w-7 h-7 drop-shadow-[0_2px_6px_rgba(255,185,85,0.45)]"
      />

      {/* ── Road with breaker bump + pothole dip ── */}
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-[30px]"
      >
        <path
          d={ROAD_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="1.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* lane dashes */}
        <path
          d="M2 46 H98"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
          strokeDasharray="4 5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* ── Accelerometer waveform, draws with scroll ── */}
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-[26px]"
      >
        <motion.path
          d={WAVE_PATH}
          fill="none"
          stroke="#ffb955"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeDasharray: 340, strokeDashoffset: waveOffset }}
        />
        {/* faint full-wave ghost so the unwritten part is visible */}
        <path
          d={WAVE_PATH}
          fill="none"
          stroke="rgba(255,185,85,0.18)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* ── Live sensor readout ── */}
      <div className="absolute -top-1 right-0 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#afc6fb]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ffb955] animate-pulse" />
        gyro:&nbsp;
        <span style={{ color: "#ffb955" }}>{statusText}</span>
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

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[minmax(160px,auto)]">
          {/* Large card: AI detection — spans 2 rows */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            variants={fadeUp}
            className="md:col-span-4 md:row-span-2 relative overflow-hidden rounded-3xl bg-[#1f3864] p-8 flex flex-col justify-between min-h-[280px]"
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
            <HazardDetectionChart />
          </motion.div>

          {/* Small card: chatbot */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            variants={fadeUp}
            className="md:col-span-2 rounded-3xl bg-white border border-[#dde2f3] p-6 flex flex-col justify-between"
          >
            <h3 className="text-lg font-semibold text-[#03224d]">
              Ask it about your route
            </h3>
            <p className="mt-2 text-sm text-[#545f72] leading-relaxed">
              "Which road to college has fewer reports this week?" — answered
              from live hazard data, not a script.
            </p>
          </motion.div>

          {/* Small card: dashboard */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            variants={fadeUp}
            className="md:col-span-2 rounded-3xl bg-white border border-[#dde2f3] p-6 flex flex-col justify-between"
          >
            <h3 className="text-lg font-semibold text-[#03224d]">
              A dashboard for the ward, not just the rider
            </h3>
            <p className="mt-2 text-sm text-[#545f72] leading-relaxed">
              Filter reports by road, severity, and week — the same view a
              civic body would use to decide what gets fixed first.
            </p>
          </motion.div>

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

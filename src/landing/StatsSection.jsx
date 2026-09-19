"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";

// ---------------------------------------------------------------------------
// One counting number. Animates from 0 -> value once it scrolls into view.
// ---------------------------------------------------------------------------
function Counter({ value, suffix = "", decimals = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        setDisplay(v.toFixed(decimals));
      },
    });
    return () => controls.stop();
  }, [isInView, value, decimals]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

const STATS = [
  { value: 1428, suffix: "", label: "Hazards logged across Bengaluru" },
  { value: 42, suffix: "", label: "Wards actively reporting" },
  { value: 94, suffix: "%", label: "Reports geo-verified on submission" },
  { value: 2.4, suffix: "s", decimals: 1, label: "Average detection response time" },
];

export default function StatsSection() {
  return (
    <section className="relative bg-[#03224d] py-24 px-6 overflow-hidden">
      {/* faint road-grid backdrop, ties back to the civic/map theme */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-5xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6 }}
          className="text-[#afc6fb] text-lg max-w-xl mb-14"
        >
          Every ride adds a data point. Here's what Bengaluru commuters have
          reported so far.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-3xl overflow-hidden">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="bg-[#03224d] p-6 md:p-8"
            >
              <div className="font-bold tracking-tight text-[#ffb955] text-4xl md:text-5xl leading-none">
                <Counter
                  value={stat.value}
                  suffix={stat.suffix}
                  decimals={stat.decimals || 0}
                />
              </div>
              <p className="mt-3 text-sm text-[#d8e2ff] leading-snug">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

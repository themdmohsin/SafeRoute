"use client";

import React from "react";
import { motion } from "framer-motion";
import { MapPinned, Users, Radar } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: MapPinned,
    title: "The problem",
    text: "Bengaluru's roads change daily — potholes, dug-up stretches and flooded underpasses no static map keeps up with.",
  },
  {
    icon: Users,
    title: "Crowdsourced",
    text: "Every commuter's ride logs what they actually hit, so the hazard map fills itself in — no extra effort.",
  },
  {
    icon: Radar,
    title: "AI-assisted",
    text: "On-device motion sensing flags likely hazards mid-ride and verifies reports before they reach the map.",
  },
];

export default function AboutSection() {
  return (
    <section id="about" className="relative bg-[#f9f9ff] py-24 px-6 overflow-hidden">
      {/* soft brand glow, echoing the features cards */}
      <div
        className="absolute -left-24 top-1/3 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #1f3864, transparent 70%)" }}
      />
      <div
        className="absolute -right-24 bottom-0 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #ffb955, transparent 70%)" }}
      />

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <p className="text-[#dd9202] text-sm font-semibold uppercase tracking-[0.2em] mb-3">
            About SafeRoute
          </p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-[#03224d] leading-[1.1]">
            Built by commuters, for the roads we all share
          </h2>

          <div className="mt-8 space-y-5 text-[#545f72] text-lg leading-relaxed">
            <p>
              SafeRoute is a hyperlocal road-safety app for Bengaluru commuters.
              Every day, thousands of riders hit potholes, unmarked diversions and
              waterlogged underpasses that no static map accounts for — and the
              same hazards get rediscovered by each new commuter. SafeRoute turns
              those daily rides into a live hazard map: report what you hit, see
              what's ahead, and route around the worst of it.
            </p>
            <p>
              The map builds itself. Hazards are crowdsourced from ordinary
              commutes — your phone's motion sensors flag likely potholes
              mid-ride, AI-assisted detection verifies and deduplicates reports,
              and confirmed hazards appear for everyone riding that road. No
              dedicated reporting trip, no extra hardware — just the ride you
              were already taking, made useful for the next person on that road.
            </p>
          </div>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
          {HIGHLIGHTS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="rounded-3xl bg-white border border-[#dde2f3] p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1f3864] flex items-center justify-center mb-4">
                  <Icon size={18} className="text-[#ffb955]" strokeWidth={2.25} />
                </div>
                <h3 className="text-base font-semibold text-[#03224d] mb-1.5">
                  {item.title}
                </h3>
                <p className="text-sm text-[#545f72] leading-relaxed">{item.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

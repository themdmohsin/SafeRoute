"use client";

import React from "react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

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
            <div className="relative flex items-end gap-1 h-16 mt-8">
              {[40, 65, 30, 88, 52, 70, 45, 60].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.3 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 rounded-t-sm bg-[#ffb955]/80"
                />
              ))}
            </div>
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

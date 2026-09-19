"use client";

import React from "react";

const COLUMNS = [
  {
    heading: "Product",
    links: ["Overview", "How it works", "Dashboard", "Report a hazard"],
  },
  {
    heading: "Project",
    links: ["About", "24CIE554 synopsis", "GitHub repo"],
  },
  {
    heading: "Contact",
    links: ["Email us", "Report a bug"],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#050d1a] text-[#afc6fb] px-6 pt-16 pb-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1f3864] to-[#0e1b33] flex items-center justify-center">
                <span className="text-[#ffb955] text-sm font-bold">S</span>
              </div>
              <span className="text-white font-semibold">SafeRoute</span>
            </div>
            <p className="text-sm leading-relaxed text-[#7a8bb0] max-w-[220px]">
              Crowdsourced road hazard reporting for Bengaluru commuters.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-white text-sm font-semibold mb-3">
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-[#7a8bb0] hover:text-[#ffb955] transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm text-[#5c6d8f]">
          <span>SafeRoute — a 24CIE554 Full Stack Development project.</span>
          <span>Bengaluru, India</span>
        </div>
      </div>
    </footer>
  );
}

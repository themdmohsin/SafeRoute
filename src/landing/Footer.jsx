"use client";

import React from "react";

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Overview', href: '#hero' },
      { label: 'How it works', href: '#features' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Report a hazard', href: '/report' },
    ],
  },
  {
    heading: 'Project',
    links: [
      { label: 'About', href: '#about' },
      { label: '24CIE554 synopsis', href: 'https://github.com/themdmohsin/SafeRoute' },
      { label: 'GitHub repo', href: 'https://github.com/themdmohsin/SafeRoute' },
    ],
  },
  {
    heading: 'Contact',
    links: [
      { label: 'Email us', href: 'mailto:hello@saferoute.app' },
      { label: 'Report a bug', href: 'mailto:hello@saferoute.app?subject=SafeRoute%20bug%20report' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#050d1a] text-[#afc6fb] px-6 pt-16 pb-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          <div className="sm:col-span-2 md:col-span-1">
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
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[#7a8bb0] hover:text-[#ffb955] transition-colors"
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                    >
                      {link.label}
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

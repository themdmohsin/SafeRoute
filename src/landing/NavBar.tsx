"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Home, Info, LayoutGrid, Mail, ArrowRight, LucideIcon } from "lucide-react";

interface NavItem {
  name: string;
  /** "#section-id" for in-page smooth scroll, or a route path */
  target: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Home", target: "#hero", icon: Home },
  { name: "About", target: "#about", icon: Info },
  { name: "Features", target: "#features", icon: LayoutGrid },
  { name: "Contact", target: "#contact", icon: Mail },
];

function smoothScrollTo(target: string) {
  if (target === "#hero" || target === "#top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function NavBar({ className = "" }: { className?: string }) {
  const [activeTab, setActiveTab] = useState(NAV_ITEMS[0].name);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll-spy: highlight the section currently in view
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const probe = 160; // navbar offset + breathing room
        let current = NAV_ITEMS[0].name;
        for (const item of NAV_ITEMS) {
          const el = document.querySelector(item.target);
          if (el && el.getBoundingClientRect().top <= probe) {
            current = item.name;
          }
        }
        setActiveTab(current);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent, item: NavItem) => {
      e.preventDefault();
      setActiveTab(item.name);
      smoothScrollTo(item.target);
    },
    []
  );

  return (
    <div
      className={`fixed bottom-0 sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:pt-6 ${className}`}
    >
      <div className="flex items-center gap-2 bg-[#0e1b33]/75 border border-white/15 backdrop-blur-xl py-1 px-1.5 rounded-full shadow-lg shadow-black/20">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;

          return (
            <a
              key={item.name}
              href={item.target}
              onClick={(e) => handleNavClick(e, item)}
              className={`relative cursor-pointer text-sm font-semibold px-4 md:px-5 py-2 rounded-full transition-colors ${
                isActive ? "text-[#ffb955]" : "text-white/75 hover:text-[#ffb955]"
              }`}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-white/10 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#ffb955] rounded-t-full">
                    <div className="absolute w-12 h-6 bg-[#ffb955]/25 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-[#ffb955]/25 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-[#ffb955]/25 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </a>
          );
        })}

        <Link
          to="/login"
          className="flex items-center gap-1.5 text-sm font-semibold rounded-full bg-gradient-to-r from-[#ffb955] to-[#dd9202] text-[#1a202c] px-4 py-2 mr-0.5 shadow-md hover:shadow-lg transition-shadow whitespace-nowrap"
        >
          {isMobile ? (
            <ArrowRight size={16} strokeWidth={2.5} />
          ) : (
            <>
              Get Started
              <ArrowRight size={15} strokeWidth={2.5} />
            </>
          )}
        </Link>
      </div>
    </div>
  );
}

export default NavBar;

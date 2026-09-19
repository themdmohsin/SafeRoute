"use client";

import React from "react";
import NavBar from "./NavBar";
import WorkPageHero from "./WorkPageHero";
import AboutSection from "./AboutSection";
import StatsSection from "./StatsSection";
import FeaturesSection from "./FeaturesSection";
import ContactSection from "./ContactSection";
import Footer from "./Footer";

export default function LandingPage() {
  return (
    <div className="bg-[#f9f9ff] min-h-screen">
      <NavBar />

      <main>
        {/* Hero (scroll-pinned, expands to full screen) */}
        <div id="hero">
          <WorkPageHero />
        </div>

        {/* About */}
        <AboutSection />

        {/* Animated stats */}
        <StatsSection />

        {/* Bento features */}
        <div id="features">
          <FeaturesSection />
        </div>

        {/* Contact */}
        <div id="contact">
          <ContactSection />
        </div>
      </main>

      <Footer />
    </div>
  );
}

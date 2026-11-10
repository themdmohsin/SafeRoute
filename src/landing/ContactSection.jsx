"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "../lib/api";

function Field({ label, type = "text", name, value, onChange, textarea }) {
  const [focused, setFocused] = useState(false);
  const filled = value && value.length > 0;
  const Tag = textarea ? "textarea" : "input";

  return (
    <div className="relative">
      <Tag
        type={textarea ? undefined : type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={textarea ? 5 : undefined}
        className={`w-full bg-white/60 backdrop-blur-md border rounded-2xl px-4 pt-7 pb-3 text-[#03224d] outline-none transition-colors resize-none ${textarea ? "min-h-[150px]" : "h-14"}
          ${focused ? "border-[#1f3864]" : "border-white/70"}`}
      />
      <motion.label
        animate={{
          top: focused || filled ? 10 : textarea ? 20 : 15,
          fontSize: focused || filled ? 11 : 15,
          color: focused ? "#1f3864" : "#545f72",
        }}
        transition={{ duration: 0.18 }}
        className="absolute left-4 pointer-events-none font-medium"
      >
        {label}
      </motion.label>
    </div>
  );
}

export default function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || !email || !message) {
      setError("Please complete all fields before sending your message.");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiRequest("/contact", {
        method: "POST",
        body: { name, email, message },
      });
      setSent(true);
      setForm({ name: "", email: "", message: "" });
    } catch (submissionError) {
      setSent(false);
      setError(submissionError instanceof Error ? submissionError.message : "Unable to send your message right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative py-24 px-6 bg-[#0e1b33] overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(31,56,100,0.6), transparent 55%), radial-gradient(circle at 80% 70%, rgba(221,146,2,0.25), transparent 50%)",
        }}
      />

      <div className="relative max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Reporting something we missed?
          </h2>
          <p className="mt-3 text-[#afc6fb]">
            Bad stretch of road, a bug in the app, or a college wanting to
            pilot this — tell us here.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-xl p-6 md:p-8 shadow-2xl space-y-5"
        >
          <Field label="Name" name="name" value={form.name} onChange={handleChange} />
          <Field label="Email" type="email" name="email" value={form.email} onChange={handleChange} />
          <Field label="Message" name="message" value={form.message} onChange={handleChange} textarea />

          {error && (
            <div className="rounded-2xl border border-red-400/60 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting}
            className="w-full h-13 py-3.5 rounded-2xl bg-gradient-to-r from-[#ffb955] to-[#dd9202] text-[#1a202c] font-semibold transition-shadow shadow-lg shadow-black/20 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-75"
          >
            {isSubmitting ? "Sending..." : sent ? "Message sent" : "Send message"}
          </motion.button>
        </motion.form>
      </div>
    </section>
  );
}

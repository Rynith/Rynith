// components/CustomerInsightsFlow.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

const flowWords = ["Insights", "Feedback", "Actions", "Growth"];

export default function CustomerInsightsFlow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % flowWords.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 bg-background text-center px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-playfair tracking-tight mb-6">
          Customer{" "}
          <span className="inline-block relative w-40 h-14">
            <AnimatePresence mode="wait">
              <motion.span
                key={flowWords[index]}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 text-primary"
              >
                {flowWords[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          Customer Whisperer turns scattered reviews and data into powerful insights — helping your team move from guesswork to clarity, effortlessly.
        </p>

        {/* Visual flow */}
        <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10">
          {["Collect", "Analyze", "Recommend"].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white border border-accent rounded-2xl px-6 py-4 shadow-md hover:shadow-lg transition-all w-60 text-left"
            >
              <h3 className="font-semibold text-xl mb-1 text-primary">{step}</h3>
              <p className="text-sm text-muted-foreground">
                {step === "Collect" &&
                  "We pull in reviews, messages, and feedback from platforms like Google, Yelp, and email."}
                {step === "Analyze" &&
                  "Our AI breaks it all down to find tone, intent, and urgency in customer communication."}
                {step === "Recommend" &&
                  "We highlight key actions and quick wins so you can fix issues before they become problems."}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

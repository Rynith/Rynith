import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const steps = [
  "Customer Feedback",
  "AI Analysis",
  "Actionable Insights",
  "Smarter Decisions",
];

const accentColors = [
  "from-[#6A0DAD] to-[#7B3AED]",
  "from-[#7B3AED] to-[#6A0DAD]",
  "from-[#4B0082] to-[#7B3AED]",
  "from-[#1A1A1A] to-[#6A0DAD]",
];

export default function CustomerInsightsShowcase() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });

  const stepIndex = useTransform(scrollYProgress, [0, 1], [0, steps.length - 1]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const unsubscribe = stepIndex.on("change", (v) => {
      setCurrentStep(Math.floor(v));
    });
    return () => unsubscribe();
  }, [stepIndex]);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[100vh] bg-gradient-to-br from-white to-[#f9f8ff] py-32 px-6 text-center overflow-hidden"
    >
      <div className="max-w-3xl mx-auto">
        <motion.h2
          className={`text-4xl sm:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${accentColors[currentStep]} transition-colors duration-700`}
          key={steps[currentStep]}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {steps[currentStep]}
        </motion.h2>

        <p className="mt-6 text-muted-foreground max-w-xl mx-auto text-base sm:text-lg">
          Rynith helps your team make better decisions by collecting reviews,
          analyzing intent and sentiment, and offering tailored insights — all in one place.
        </p>

        <div className="mt-16 grid sm:grid-cols-2 gap-10 items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-6 rounded-2xl shadow-xl bg-white border border-gray-200 hover:border-primary transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Collect Feedback</h3>
            <p className="text-sm text-gray-500">
              Aggregate reviews from Google, Yelp, Facebook, and more into a unified dashboard.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-6 rounded-2xl shadow-xl bg-white border border-gray-200 hover:border-primary transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis</h3>
            <p className="text-sm text-gray-500">
              Understand tone, intent, and patterns using powerful AI-driven processing.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-6 rounded-2xl shadow-xl bg-white border border-gray-200 hover:border-primary transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recommend Actions</h3>
            <p className="text-sm text-gray-500">
              Get tailored suggestions to improve customer experience in real-time.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-6 rounded-2xl shadow-xl bg-white border border-gray-200 hover:border-primary transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Automate Decisions</h3>
            <p className="text-sm text-gray-500">
              Deploy automations or trigger workflows that solve problems before they grow.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

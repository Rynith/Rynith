// components/AnimatedHero.tsx
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function AnimatedHero() {
  return (
    <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <div className="text-sm text-gray-400 mb-2">
            ⭐ <span className="text-white font-medium">4.7/5.0</span> on google.com
          </div>

          <h1 className="text-5xl md:text-6xl font-serif font-bold text-balance leading-tight mb-6">
                Turn Customer <br /> Feedback Into{" "}
            <span className="inline-block bg-[#7B3AED] text-white px-2 py-1 rounded-lg ml-1">
              Action
            </span>
          </h1>

          <p className="text-lg text-gray-300 mb-10 leading-relaxed">
            Customer Whisperer analyzes reviews, chats, and comments to give you weekly AI-powered insights and action steps.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="#features">
              <Button className="bg-gradient-to-r from-[#6A0DAD] to-[#7B3AED] hover:from-[#5A0B9D] hover:to-[#6B2ADD] text-white px-6 py-3 text-lg shadow-lg rounded-xl">
               Start Listening
              </Button>
            </Link>

            <Link href="#pricing">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-6 py-3 text-lg rounded-xl">
              See How it Works
              </Button>
            </Link>
          </div>
        </motion.div>
  );
}

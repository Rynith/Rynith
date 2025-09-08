// components/AnimatedDashboardCards.tsx
"use client"

import Image from "next/image"
import { motion } from "framer-motion"

const bounceTransition = {
  repeat: Infinity,
  repeatType: "reverse",
  duration: 0.8,
  ease: "easeInOut",
}

export function AnimatedDashboardCards() {
  return (
    <div className="flex justify-center items-end gap-6 overflow-hidden mt-10">
      {/* Card 1 */}
      <motion.div
        className="relative w-64 h-96 rounded-xl shadow-xl overflow-hidden rotate-[-8deg]"
        animate={{ y: [0, -20] }}
        transition={bounceTransition}
      >
        <Image
          src="/dashboard1.png"
          alt="Dashboard 1"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
      </motion.div>

      {/* Card 2 */}
      <motion.div
        className="relative w-64 h-96 rounded-xl shadow-xl overflow-hidden rotate-[0deg] z-10"
        animate={{ y: [0, -30] }}
        transition={bounceTransition}
      >
        <Image
          src="/dashboard2.png"
          alt="Dashboard 2"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
      </motion.div>

      {/* Card 3 */}
      <motion.div
        className="relative w-64 h-96 rounded-xl shadow-xl overflow-hidden rotate-[8deg]"
        animate={{ y: [0, -20] }}
        transition={bounceTransition}
      >
        <Image
          src="/dashboard3.png"
          alt="Dashboard 3"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
      </motion.div>
    </div>
  )
}

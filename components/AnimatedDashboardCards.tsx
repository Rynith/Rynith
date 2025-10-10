// components/AnimatedDashboardCards.tsx
"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

const bounce: Transition = {
  repeat: Infinity,
  repeatType: "reverse",
  duration: 1.05,
  ease: "easeInOut",
};

export function AnimatedDashboardCards() {
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const set = () => setIsMobile(mq.matches);
    set();
    mq.addEventListener?.("change", set);
    return () => mq.removeEventListener?.("change", set);
  }, []);

  const animateLeftRight = useMemo(
    () => (prefersReduced ? { y: 0 } : { y: [0, -(isMobile ? 6 : 10), 0] }),
    [prefersReduced, isMobile]
  );
  const animateCenter = useMemo(
    () => (prefersReduced ? { y: 0 } : { y: [0, -(isMobile ? 8 : 14), 0] }),
    [prefersReduced, isMobile]
  );

  return (
    <div className="relative mx-auto w-full max-w-[1100px] overflow-x-hidden">
      <div className="relative overflow-visible mt-12">
        <div
          className="
            relative mx-auto flex items-end justify-center
            gap-2 xs:gap-3 sm:gap-6 md:gap-10
          "
        >
          {/* LEFT (decorative) */}
          <motion.div
            className="
              relative overflow-hidden rounded-[20px] sm:rounded-[24px] md:rounded-[28px] shadow-2xl ring-1 ring-black/5
              w-[110px] h-[190px] xs:w-[130px] xs:h-[220px]
              sm:w-[200px] sm:h-[340px]
              md:w-[240px] md:h-[400px]
              -rotate-[9deg] translate-y-[2px] md:-translate-x-4
            "
            animate={animateLeftRight}
            transition={{ y: bounce }}
            aria-hidden="true"
          >
            <Image
              src="/dashboard1.png"
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 130px, (max-width: 768px) 200px, 240px"
              loading="lazy"
            />
          </motion.div>

          {/* CENTER (primary) */}
          <motion.div
            className="
              relative z-10 overflow-hidden rounded-[20px] sm:rounded-[24px] md:rounded-[28px] shadow-2xl ring-1 ring-black/5
              w-[120px] h-[210px] xs:w-[140px] xs:h-[235px]
              sm:w-[220px] sm:h-[360px]
              md:w-[260px] md:h-[420px]
            "
            animate={animateCenter}
            transition={{ y: bounce }}
          >
            <Image
              src="/dashboard2.png"
              alt="Dashboard preview"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 140px, (max-width: 768px) 220px, 260px"
              priority
            />
          </motion.div>

          {/* RIGHT (decorative) */}
          <motion.div
            className="
              relative overflow-hidden rounded-[20px] sm:rounded-[24px] md:rounded-[28px] shadow-2xl ring-1 ring-black/5
              w-[110px] h-[190px] xs:w-[130px] xs:h-[220px]
              sm:w-[200px] sm:h-[340px]
              md:w-[240px] md:h-[400px]
              rotate-[9deg] translate-y-[2px] md:translate-x-4
            "
            animate={animateLeftRight}
            transition={{ y: bounce }}
            aria-hidden="true"
          >
            <Image
              src="/dashboard3.png"
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 130px, (max-width: 768px) 200px, 240px"
              loading="lazy"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}// // components/AnimatedDashboardCards.tsx












// "use client";

// import Image from "next/image";
// import { motion, useReducedMotion, type Transition } from "framer-motion";

// const bounce: Transition = {
//   repeat: Infinity,
//   repeatType: "reverse",
//   duration: 1.05,
//   ease: "easeInOut",
// };

// export function AnimatedDashboardCards() {
//   const prefersReduced = useReducedMotion();
//   const animate = (desktop: number, mobile: number) =>
//     prefersReduced ? { y: 0 } : { y: [0, -(typeof window !== "undefined" && window.innerWidth < 640 ? mobile : desktop), 0] };

//   return (
//     <div className="relative mx-auto w-full max-w-[1100px]">
//       {/* no extra margins or clipping */}
//       <div className="relative overflow-visible mt-12">
//         <div
//           className="
//             relative mx-auto flex items-end justify-center
//             gap-2 xs:gap-3 sm:gap-6 md:gap-10
//           "
//         >
//           {/* LEFT */}
//           <motion.div
//             className="
//               relative overflow-hidden rounded-[20px] sm:rounded-[24px] md:rounded-[28px] shadow-2xl ring-1 ring-black/5
//               w-[110px] h-[190px] xs:w-[130px] xs:h-[220px]
//               sm:w-[200px] sm:h-[340px]
//               md:w-[240px] md:h-[400px]
//               -rotate-[9deg] translate-y-[2px] md:-translate-x-4
//             "
//             animate={animate(10, 6)}
//             transition={{ y: bounce }}
//             aria-hidden="true"
//           >
//             <Image
//               src="/dashboard1.png"
//               alt="Dashboard preview left"
//               fill
//               className="object-cover"
//               sizes="(max-width: 640px) 130px, (max-width: 768px) 200px, 240px"
//               priority
//             />
//           </motion.div>

//           {/* CENTER */}
//           <motion.div
//             className="
//               relative z-10 overflow-hidden rounded-[20px] sm:rounded-[24px] md:rounded-[28px] shadow-2xl ring-1 ring-black/5
//               w-[120px] h-[210px] xs:w-[140px] xs:h-[235px]
//               sm:w-[220px] sm:h-[360px]
//               md:w-[260px] md:h-[420px]
//             "
//             animate={animate(14, 8)}
//             transition={{ y: bounce }}
//           >
//             <Image
//               src="/dashboard2.png"
//               alt="Dashboard preview center"
//               fill
//               className="object-cover"
//               sizes="(max-width: 640px) 140px, (max-width: 768px) 220px, 260px"
//               priority
//             />
//           </motion.div>

//           {/* RIGHT */}
//           <motion.div
//             className="
//               relative overflow-hidden rounded-[20px] sm:rounded-[24px] md:rounded-[28px] shadow-2xl ring-1 ring-black/5
//               w-[110px] h-[190px] xs:w-[130px] xs:h-[220px]
//               sm:w-[200px] sm:h-[340px]
//               md:w-[240px] md:h-[400px]
//               rotate-[9deg] translate-y-[2px] md:translate-x-4
//             "
//             animate={animate(10, 6)}
//             transition={{ y: bounce }}
//             aria-hidden="true"
//           >
//             <Image
//               src="/dashboard3.png"
//               alt="Dashboard preview right"
//               fill
//               className="object-cover"
//               sizes="(max-width: 640px) 130px, (max-width: 768px) 200px, 240px"
//               priority
//             />
//           </motion.div>
//         </div>
//       </div>
//     </div>
//   );
// }

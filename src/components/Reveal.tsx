import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const SPRING = [0.32, 0.72, 0, 1] as const;

/** Heavy fade-up + blur entry on viewport enter (premium scroll choreography). */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: SPRING }}
    >
      {children}
    </motion.div>
  );
}

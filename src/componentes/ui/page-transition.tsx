import { motion } from "framer-motion";
import type { ReactNode } from "react";

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper for page content with enter/exit fade + slide animation.
 * Wrap the root element of each page for smooth transitions.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

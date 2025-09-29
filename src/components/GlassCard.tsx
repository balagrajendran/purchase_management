import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { cn } from './ui/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        "backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border border-white/20 dark:border-gray-700/30 rounded-xl shadow-xl",
        hover && "hover:shadow-2xl hover:bg-white/80 dark:hover:bg-gray-900/80",
        className
      )}
      whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
      transition={{
        duration: 0.2,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  );
}
import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

/**
 * Scroll-reveal wrapper. Respects prefers-reduced-motion.
 * Uses transform + opacity + blur only (GPU-friendly, no layout shift).
 * variant: 'up' | 'down' | 'left' | 'right' | 'scale' | 'blur' | 'clip'
 */
export default function Reveal({
  children,
  delay = 0,
  y = 26,
  as = 'div',
  variant = 'up',
  className,
  duration = 0.7,
  ...rest
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] || motion.div

  const from = {
    up: { opacity: 0, y },
    down: { opacity: 0, y: -y },
    left: { opacity: 0, x: y },
    right: { opacity: 0, x: -y },
    scale: { opacity: 0, scale: 0.92, y: y * 0.5 },
    blur: { opacity: 0, y: y * 0.6, filter: 'blur(12px)' },
    clip: { opacity: 0, y, clipPath: 'inset(0 0 100% 0)' },
  }[variant] || { opacity: 0, y }

  const to = {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    clipPath: 'inset(0 0 0% 0)',
  }

  return (
    <MotionTag
      className={className}
      initial={reduce ? { opacity: 0 } : from}
      whileInView={reduce ? { opacity: 1 } : to}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

/** Staggered container: children reveal in sequence. */
export function Stagger({ children, className, gap = 0.1, delayChildren = 0.05, ...rest }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-70px' }}
      variants={{
        show: { transition: { staggerChildren: reduce ? 0 : gap, delayChildren } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className, y = 26, ...rest }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y, scale: 0.96, filter: 'blur(8px)' },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          transition: { duration: 0.65, ease: EASE },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

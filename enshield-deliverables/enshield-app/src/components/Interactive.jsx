import { useRef, useState, useEffect } from 'react'
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useInView,
  animate,
} from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

/* ---------- Scroll progress bar (top of page) ---------- */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />
}

/* ---------- Spotlight + 3D tilt card ----------
   Pointer-following radial glow + subtle 3D tilt toward the cursor.
   Falls back to a plain card when reduced-motion is on. */
export function TiltCard({ children, className = '', tilt = 6, ...rest }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)

  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rx = useSpring(useTransform(my, [0, 1], [tilt, -tilt]), { stiffness: 150, damping: 18 })
  const ry = useSpring(useTransform(mx, [0, 1], [-tilt, tilt]), { stiffness: 150, damping: 18 })

  const [glow, setGlow] = useState({ x: '50%', y: '50%' })

  function handleMove(e) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    mx.set(px)
    my.set(py)
    setGlow({ x: `${px * 100}%`, y: `${py * 100}%` })
  }
  function reset() {
    mx.set(0.5)
    my.set(0.5)
  }

  if (reduce) {
    return (
      <div className={`tilt-card ${className}`} {...rest}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={`tilt-card ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      variants={{
        hidden: { opacity: 0, y: 28, scale: 0.95, filter: 'blur(8px)' },
        show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.65, ease: EASE } },
      }}
      {...rest}
    >
      <span
        className="card-glow"
        style={{ background: `radial-gradient(320px circle at ${glow.x} ${glow.y}, rgba(15,158,152,.16), transparent 70%)` }}
        aria-hidden="true"
      />
      <div className="tilt-inner">{children}</div>
    </motion.div>
  )
}

/* ---------- Magnetic wrapper (buttons pull toward cursor) ---------- */
export function Magnetic({ children, strength = 0.35, className = '' }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const x = useSpring(useMotionValue(0), { stiffness: 200, damping: 15 })
  const y = useSpring(useMotionValue(0), { stiffness: 200, damping: 15 })

  function move(e) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  function leave() {
    x.set(0)
    y.set(0)
  }

  if (reduce) return <span className={className}>{children}</span>

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{ x, y, display: 'inline-flex' }}
      onMouseMove={move}
      onMouseLeave={leave}
    >
      {children}
    </motion.span>
  )
}

/* ---------- Animated number counter (counts up when in view) ---------- */
export function Counter({ value, prefix = '', suffix = '', decimals = 0, duration = 1.6 }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(reduce ? value : 0)

  useEffect(() => {
    if (!inView || reduce) {
      if (reduce) setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [inView, value, reduce, duration])

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}

/* ---------- Word-by-word reveal for headlines ---------- */
export function AnimatedWords({ text, className = '', as = 'h1', delay = 0 }) {
  const reduce = useReducedMotion()
  const Tag = motion[as] || motion.h1
  const words = text.split(' ')

  if (reduce) {
    const Plain = as
    return <Plain className={className}>{text}</Plain>
  }

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ show: { transition: { staggerChildren: 0.055, delayChildren: delay } } }}
    >
      {words.map((w, i) => (
        <span key={i} className="word-mask">
          <motion.span
            className="word"
            variants={{
              hidden: { y: '110%', opacity: 0 },
              show: { y: '0%', opacity: 1, transition: { duration: 0.7, ease: EASE } },
            }}
            dangerouslySetInnerHTML={{ __html: w + (i < words.length - 1 ? '&nbsp;' : '') }}
          />
        </span>
      ))}
    </Tag>
  )
}

/* ---------- Infinite marquee (logo strip) ---------- */
export function Marquee({ children, speed = 26 }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className="marks">{children}</div>
  return (
    <div className="marquee" aria-hidden="false">
      <motion.div
        className="marquee-track"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        <div className="marks">{children}</div>
        <div className="marks" aria-hidden="true">{children}</div>
      </motion.div>
    </div>
  )
}

/* ---------- Parallax float (subtle depth on scroll) ---------- */
export function Parallax({ children, offset = 40, className = '' }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset])
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  )
}

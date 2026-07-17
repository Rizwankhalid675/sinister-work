import { motion, useReducedMotion } from 'framer-motion'
import Reveal, { Stagger, StaggerItem } from './components/Reveal.jsx'
import {
  ScrollProgress, TiltCard, Magnetic, Counter, AnimatedWords, Marquee, Parallax,
} from './components/Interactive.jsx'
import { Shield, Plug, Chart, Check, Arrow, Menu, BigShield } from './components/icons.jsx'

const features = [
  { icon: <Shield />, title: 'Ease of Mind', body: 'Every order is covered until it reaches your customer. We handle lost, stolen, and damaged claims for you — keeping support out of the claims cycle and turning issues into repeat purchases.' },
  { icon: <Plug />, title: 'One-Click Integration', body: 'Designed to drop into any store in minutes. Merchants of any size can offer protection at checkout, turning a basic add-on into a premium customer-experience touchpoint.' },
  { icon: <Chart />, title: 'Turning Risk into Profit', body: 'Enshield turns your checkout into a profit center. We handle all claims, so there is no added work — the result is monetizing risk instead of absorbing it, on every order.' },
]

const steps = [
  { n: '1', t: 'Connect', p: 'Add Enshield to your checkout with a one-click app or a single snippet.' },
  { n: '2', t: 'Protect', p: 'Shoppers opt into protection at checkout — automatically priced per order.' },
  { n: '3', t: 'Earn', p: 'You keep a margin on every protected order. Revenue lands with your payouts.' },
  { n: '4', t: 'Relax', p: 'Any claim comes straight to us. Your team never touches the claims cycle.' },
]

const stats = [
  { v: 18, prefix: '+', suffix: '%', s: 'Avg. margin added per order' },
  { v: 2, suffix: 'M+', s: 'Packages protected' },
  { v: 24, prefix: '<', suffix: 'h', s: 'Average claim resolution' },
  { v: 0, suffix: '', s: 'Support tickets for your team' },
]

const quotes = [
  { av: 'RM', name: 'Rachel M.', role: 'Ops Lead, Northbound Apparel', text: 'We turned our biggest support headache into a profit line. Claims used to eat hours every week — now they just don’t reach us.' },
  { av: 'DV', name: 'Diego V.', role: 'Founder, Velocity Gear', text: 'Setup took an afternoon. The extra margin per order paid for itself in the first week. Wish we’d added it a year ago.' },
  { av: 'SK', name: 'Sara K.', role: 'CX Manager, Harbor Co.', text: 'Customers actually thank us now when a package goes missing. Fast replacements, zero friction. A retention tool disguised as insurance.' },
]

const bars = [
  { h: 32, l: 'Before', muted: true },
  { h: 56, l: 'Mo 1' },
  { h: 72, l: 'Mo 2' },
  { h: 90, l: 'Mo 3' },
  { h: 100, l: 'Mo 4' },
]

function BrandMark({ size = 24 }) {
  return (
    <span className="brand">
      <Shield size={size} stroke="#0b7a75" sw={1.9} />
      Enshield
    </span>
  )
}

export default function App() {
  const reduce = useReducedMotion()

  return (
    <>
      <ScrollProgress />

      {/* HEADER */}
      <header className="hdr">
        <div className="wrap hdr-in">
          <BrandMark />
          <nav className="navlinks" aria-label="Primary">
            <a href="#how">How it works</a>
            <a href="#profit">Profit</a>
            <a href="#proof">Results</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="hdr-cta">
            <a href="#" className="btn btn-ghost">Sign in</a>
            <Magnetic><a href="#book" className="btn btn-primary">Book a demo</a></Magnetic>
            <button className="menu-btn" aria-label="Open menu"><Menu /></button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <span className="glow glow-a" />
          <span className="glow glow-b" />
          <span className="grid-lines" />
        </div>
        <div className="wrap hero-grid">
          <div>
            <Reveal variant="blur"><span className="eyebrow">Shipping protection, reinvented</span></Reveal>
            <AnimatedWords as="h1" className="hero-h1" text="Turn shipping risk into recurring profit." delay={0.1} />
            <Reveal variant="blur" delay={0.5}>
              <p className="lead">
                Enshield protects every order against loss, theft, and damage — and pays
                merchants a margin on every checkout. One-click integration. Zero support
                overhead. All claims handled for you.
              </p>
            </Reveal>
            <Reveal delay={0.6}>
              <div className="hero-cta">
                <Magnetic><a href="#book" className="btn btn-primary">Book a 15-min demo <Arrow /></a></Magnetic>
                <a href="#how" className="btn btn-ghost">See how it works</a>
              </div>
            </Reveal>
            <Reveal delay={0.7}>
              <div className="trust">
                <div><b>4.9/5</b>merchant rating</div>
                <div><b>2M+</b>orders protected</div>
                <div><b>&lt;24h</b>claim resolution</div>
              </div>
            </Reveal>
          </div>

          <motion.div
            className="hero-visual"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <motion.div
              className="orb"
              animate={reduce ? {} : { y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="orb-ring orb-ring-1" aria-hidden="true" />
              <span className="orb-ring orb-ring-2" aria-hidden="true" />
              <BigShield className="orb-shield" />
              <motion.div className="chip chip-1"
                initial={reduce ? {} : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                <motion.span className="chip-float"
                  animate={reduce ? {} : { y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                  <b>+18%</b>margin per order
                </motion.span>
              </motion.div>
              <motion.div className="chip chip-2"
                initial={reduce ? {} : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                <motion.span className="chip-float"
                  animate={reduce ? {} : { y: [0, 8, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}>
                  <b>0 tickets</b>for your team
                </motion.span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* STRIP */}
      <div className="strip">
        <div className="wrap strip-in">
          <span>Trusted by growing eCommerce brands</span>
          <Marquee speed={28}>
            <b>Northbound</b><b>Velocity</b><b>Harbor&nbsp;Co.</b><b>Lumen</b><b>Axis&nbsp;Gear</b>
          </Marquee>
        </div>
      </div>

      {/* FEATURES */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <Reveal><span className="eyebrow">Protection &amp; profit made simple</span></Reveal>
            <Reveal variant="blur" delay={0.05} as="h2">Everything a merchant wants. None of the work.</Reveal>
            <Reveal delay={0.1}>
              <p>Enshield sits quietly at checkout, protects the customer, and turns delivery
              risk into a new revenue line — without adding a single task to your team.</p>
            </Reveal>
          </div>
          <Stagger className="cards">
            {features.map((f) => (
              <TiltCard className="card" key={f.title}>
                <div className="ic">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                <span className="card-arrow"><Arrow /></span>
              </TiltCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sec sec-soft" id="how">
        <div className="wrap">
          <div className="sec-head">
            <Reveal><span className="eyebrow">How it works</span></Reveal>
            <Reveal variant="blur" delay={0.05} as="h2">Live in one afternoon.</Reveal>
            <Reveal delay={0.1}>
              <p>No developers, no long onboarding. Flip it on and start earning the same day.</p>
            </Reveal>
          </div>
          <Stagger className="steps">
            {steps.map((s) => (
              <StaggerItem className="step" key={s.n}>
                <span className="step-line" aria-hidden="true" />
                <div className="num">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.p}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* STATS */}
      <section className="sec">
        <div className="wrap">
          <Reveal variant="scale">
            <div className="stats">
              <span className="stats-glow" aria-hidden="true" />
              {stats.map((s) => (
                <div key={s.s} className="stat-cell">
                  <div className="n"><em><Counter value={s.v} prefix={s.prefix || ''} suffix={s.suffix || ''} /></em></div>
                  <span>{s.s}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* PROFIT SPLIT */}
      <section className="sec sec-soft" id="profit">
        <div className="wrap split">
          <div>
            <Reveal><span className="eyebrow">Build profit into every checkout</span></Reveal>
            <Reveal variant="blur" delay={0.05} as="h2">You already carry the risk. Now get paid for it.</Reveal>
            <Reveal delay={0.1}>
              <p className="lead">Most merchants quietly eat the cost of every lost or stolen
              package. Enshield flips that — turning an unavoidable liability into a
              predictable, high-margin revenue stream.</p>
            </Reveal>
            <Stagger className="checks" gap={0.12}>
              {[
                ['New revenue on day one', 'Margin on every protected order, paid with your normal payouts.'],
                ['Fewer refunds & chargebacks', 'Protected orders get resolved as claims, not lost revenue.'],
                ['Happier customers', 'Fast, no-hassle replacements turn a bad delivery into loyalty.'],
              ].map(([b, p]) => (
                <StaggerItem as="div" key={b}>
                  <li>
                    <span className="ck"><Check /></span>
                    <div><b>{b}</b><p>{p}</p></div>
                  </li>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          <Reveal variant="left" delay={0.1}>
            <div className="panel">
              <span className="card-glow panel-sheen" aria-hidden="true" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-soft)' }}>
                <span>Monthly profit impact</span>
                <span className="teal" style={{ fontWeight: 600 }}>with Enshield</span>
              </div>
              <div className="bars">
                {bars.map((b, i) => (
                  <div className="bar-wrap" key={b.l}>
                    <motion.div
                      className={`bar ${b.muted ? 'muted' : ''}`}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${b.h}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <div className="bar-lbl">{b.l}</div>
                  </div>
                ))}
              </div>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)', marginTop: 14 }}>
                Illustrative — actual results vary by order volume &amp; AOV.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="sec" id="proof">
        <div className="wrap">
          <div className="sec-head">
            <Reveal><span className="eyebrow">Merchant results</span></Reveal>
            <Reveal variant="blur" delay={0.05} as="h2">Loved by the teams who use it.</Reveal>
          </div>
          <Stagger className="quotes">
            {quotes.map((q) => (
              <TiltCard className="quote" key={q.name} tilt={5}>
                <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
                <p>{q.text}</p>
                <div className="who">
                  <div className="av">{q.av}</div>
                  <div><b>{q.name}</b><span>{q.role}</span></div>
                </div>
              </TiltCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="sec" id="book">
        <div className="wrap">
          <Reveal variant="scale">
            <div className="cta">
              <span className="cta-glow" aria-hidden="true" />
              <h2>See how Enshield adds profit to every order.</h2>
              <p>Book a free 15-minute intro call. We’ll show you exactly how much
              protection can add to your bottom line — no pressure, no commitment.</p>
              <Magnetic><a href="#" className="btn btn-primary">Book your intro call <Arrow /></a></Magnetic>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ft" id="faq">
        <div className="wrap">
          <div className="ft-grid">
            <div>
              <BrandMark size={22} />
              <p className="desc">Redefining the standard in shipping protection — and building
              profit into every checkout.</p>
            </div>
            <div>
              <h4>Product</h4>
              <a href="#how">How it works</a>
              <a href="#profit">Profit model</a>
              <a href="#">Integrations</a>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#book">Book a demo</a>
              <a href="#">Contact</a>
            </div>
            <div>
              <h4>Legal</h4>
              <a href="#">Privacy policy</a>
              <a href="#">Terms of service</a>
            </div>
          </div>
          <div className="ft-bot">
            <span>© 2026 Enshield Inc. All rights reserved.</span>
            <span>Shipping protection for lost, stolen &amp; damaged packages.</span>
          </div>
        </div>
      </footer>
    </>
  )
}

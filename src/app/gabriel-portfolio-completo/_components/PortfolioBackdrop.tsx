'use client'

import { useMemo } from 'react'

function MiniLaptopIcon({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <rect x="4" y="5" width="16" height="11" rx="1.5" opacity="0.9" />
      <path d="M2 17.5h20l-1.8 2.5H3.8L2 17.5z" opacity="0.75" />
      <rect x="7" y="8" width="10" height="6" rx="0.5" fill="rgba(125,211,252,0.35)" />
    </svg>
  )
}

function MiniChipIcon({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <rect x="7" y="7" width="10" height="10" rx="1.5" opacity="0.85" />
      <path
        d="M9 4v2M12 4v2M15 4v2M9 18v2M12 18v2M15 18v2M4 9h2M4 12h2M4 15h2M18 9h2M18 12h2M18 15h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

type FallingGlyph = {
  id: string
  left: string
  delay: string
  duration: string
  size: number
  kind: 'laptop' | 'chip'
  drift: string
}

export default function PortfolioBackdrop() {
  const rain = useMemo(
    () =>
      [
        { left: '6%', delay: '0s', duration: '9s', h: '18%' },
        { left: '18%', delay: '2.2s', duration: '11s', h: '22%' },
        { left: '32%', delay: '1.1s', duration: '8.5s', h: '14%' },
        { left: '48%', delay: '4.5s', duration: '12s', h: '26%' },
        { left: '62%', delay: '0.6s', duration: '10s', h: '16%' },
        { left: '76%', delay: '3.3s', duration: '9.5s', h: '20%' },
        { left: '90%', delay: '1.8s', duration: '11.5s', h: '17%' },
      ] as const,
    []
  )

  const fallingGlyphs = useMemo<FallingGlyph[]>(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: `glyph-${i}`,
        left: `${4 + ((i * 17) % 92)}%`,
        delay: `${(i * 1.37) % 14}s`,
        duration: `${10 + (i % 6) * 2.2}s`,
        size: 14 + (i % 4) * 4,
        kind: i % 3 === 0 ? 'chip' : 'laptop',
        drift: i % 2 === 0 ? 'gop-glyph-drift-a' : 'gop-glyph-drift-b',
      })),
    []
  )

  const sparkles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: `spark-${i}`,
        left: `${(i * 23) % 100}%`,
        top: `${(i * 31) % 100}%`,
        delay: `${(i * 0.55) % 5}s`,
        size: 2 + (i % 3),
      })),
    []
  )

  return (
    <div className="gop-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 75% 50% at 20% 0%, rgba(96, 165, 250, 0.22), transparent 55%),
            radial-gradient(ellipse 60% 45% at 85% 15%, rgba(129, 140, 248, 0.18), transparent 52%),
            radial-gradient(ellipse 55% 40% at 50% 100%, rgba(56, 189, 248, 0.12), transparent 50%),
            radial-gradient(ellipse 40% 30% at 10% 70%, rgba(99, 102, 241, 0.14), transparent 45%),
            linear-gradient(165deg, #141f33 0%, #1a2844 38%, #152238 72%, #121c30 100%)
          `,
        }}
      />

      <div className="gop-orb gop-orb-a absolute -left-20 top-[12%] h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="gop-orb gop-orb-b absolute -right-24 top-[35%] h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl" />
      <div className="gop-orb gop-orb-c absolute bottom-[8%] left-1/3 h-64 w-64 rounded-full bg-cyan-400/12 blur-3xl" />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.22]"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="gop-cable" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0" />
            <stop offset="45%" stopColor="#93c5fd" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="url(#gop-cable)" strokeWidth="1" fill="none" opacity="0.7">
          <path d="M-40 120 H200 L300 200 H500 L600 150 H800" />
          <path d="M900 90 H1100 L1200 160 H1500" />
          <path d="M40 400 H160 L240 470 H420 L500 420 H680" />
          <path d="M720 500 H920 L1000 570 H1260 L1340 520 H1500" />
        </g>
        <g fill="none" strokeLinecap="round">
          <path
            className="gop-cable-pulse gop-cable-pulse-a"
            d="M-40 120 H200 L300 200 H500 L600 150 H800"
            stroke="#bae6fd"
            strokeWidth="1.75"
          />
          <path
            className="gop-cable-pulse gop-cable-pulse-b"
            d="M720 500 H920 L1000 570 H1260 L1340 520 H1500"
            stroke="#c4b5fd"
            strokeWidth="1.75"
          />
        </g>
      </svg>

      <div className="absolute inset-0 opacity-[0.14]">
        {rain.map((drop) => (
          <span
            key={drop.left}
            className="gop-rain-drop absolute top-0 w-px"
            style={{
              left: drop.left,
              height: drop.h,
              animationDelay: drop.delay,
              animationDuration: drop.duration,
              background:
                'linear-gradient(to bottom, transparent, rgba(186,230,253,0.9), rgba(125,211,252,0.35), transparent)',
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {fallingGlyphs.map((g) => (
          <span
            key={g.id}
            className={`gop-tech-glyph absolute text-sky-300/35 ${g.drift}`}
            style={{
              left: g.left,
              animationDelay: g.delay,
              animationDuration: g.duration,
            }}
          >
            {g.kind === 'chip' ? (
              <MiniChipIcon style={{ width: g.size, height: g.size }} />
            ) : (
              <MiniLaptopIcon style={{ width: g.size, height: g.size }} />
            )}
          </span>
        ))}
      </div>

      <div className="absolute inset-0">
        {sparkles.map((s) => (
          <span
            key={s.id}
            className="gop-sparkle absolute rounded-full bg-sky-200"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
            }}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 88%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 88%)',
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(12,20,36,0.35)_100%)]" />
    </div>
  )
}

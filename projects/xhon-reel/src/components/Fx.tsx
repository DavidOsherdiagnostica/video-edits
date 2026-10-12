import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, Easing} from 'remotion';
import {C} from '../theme';

/** Animated film grain + vignette laid over the whole reel. */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width="100%" height="100%" style={{position: 'absolute', opacity: 0.11, mixBlendMode: 'overlay'}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}}
      />
    </AbsoluteFill>
  );
};

/** Dark teal studio backdrop with a receding perspective grid and drifting dust. */
export const Backdrop: React.FC<{tint?: string; grid?: boolean}> = ({tint = C.teal, grid = true}) => {
  const frame = useCurrentFrame();
  const dots = new Array(40).fill(0).map((_, i) => {
    const x = random(`x${i}`) * 1080;
    const y = (random(`y${i}`) * 2200 - frame * (0.6 + random(`s${i}`) * 1.6)) % 2200;
    const r = 2 + random(`r${i}`) * 5;
    return {x, y: y < -100 ? y + 2200 : y, r, o: 0.15 + random(`o${i}`) * 0.4};
  });
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 90% 70% at 50% 35%, ${tint}55 0%, ${C.deep} 45%, ${C.ink} 100%)`}}>
      {grid && (
        <div style={{position: 'absolute', inset: 0, perspective: 900, overflow: 'hidden'}}>
          <div
            style={{
              position: 'absolute',
              left: -1200,
              right: -1200,
              top: 1150,
              height: 2600,
              transform: 'rotateX(74deg)',
              transformOrigin: 'top',
              backgroundImage: `linear-gradient(${C.glow}33 2px, transparent 2px), linear-gradient(90deg, ${C.glow}33 2px, transparent 2px)`,
              backgroundSize: '120px 120px',
              backgroundPosition: `0 ${(frame * 4) % 120}px`,
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 50%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 45%, transparent 90%)',
            }}
          />
        </div>
      )}
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: d.x,
            top: d.y,
            width: d.r,
            height: d.r,
            borderRadius: '50%',
            background: C.mint,
            opacity: d.o,
            filter: `blur(${d.r > 5 ? 2 : 0}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Zoom-blur entrance used on every cut. */
export const SceneIn: React.FC<{children: React.ReactNode; dur?: number; from?: number; rotate?: number}> = ({
  children,
  dur = 8,
  from = 1.12,
  rotate = 0,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, dur], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const flash = interpolate(frame, [0, 3], [0.35, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `scale(${from + (1 - from) * p}) rotate(${rotate * (1 - p)}deg)`,
          filter: p < 1 ? `blur(${(1 - p) * 14}px)` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
      <AbsoluteFill style={{background: C.white, opacity: flash, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

/** Short camera shake starting at `at` frames. */
export const shake = (frame: number, at: number, amp = 18, len = 10) => {
  const t = frame - at;
  if (t < 0 || t > len) return {x: 0, y: 0, r: 0};
  const k = (1 - t / len) ** 2;
  return {
    x: (random(`sx${t}`) - 0.5) * 2 * amp * k,
    y: (random(`sy${t}`) - 0.5) * 2 * amp * k,
    r: (random(`sr${t}`) - 0.5) * 1.2 * k,
  };
};

/** RGB-split glitch overlay helper: returns a CSS filter string for a short burst. */
export const glitchFilter = (frame: number, at: number, len = 6) => {
  const t = frame - at;
  if (t < 0 || t > len) return undefined;
  const o = Math.round((random(`g${t}`) - 0.5) * 22);
  return `drop-shadow(${o}px 0 0 rgba(255,0,80,0.7)) drop-shadow(${-o}px 0 0 rgba(0,255,230,0.7))`;
};

export const pop = (frame: number, at: number, dur = 9) => {
  const t = Math.max(0, frame - at);
  if (frame < at) return 0;
  const p = Math.min(t / dur, 1);
  // overshoot ease
  const s = 1.70158 * 1.3;
  return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
};

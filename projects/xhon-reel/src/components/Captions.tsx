import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {Caption, f, TL} from '../timeline';
import {C} from '../theme';

type Style = {top: number; size: number};

const STYLES: Record<string, Style> = {
  default: {top: 1270, size: 84},
  low: {top: 1450, size: 76},
  hero: {top: 820, size: 116},
};

/** Word-by-word captions: chunk pops in, the spoken word lights up, key words glow mint. */
export const Captions: React.FC<{hidden: string[]; placement: Record<string, keyof typeof STYLES>}> = ({hidden, placement}) => {
  const frame = useCurrentFrame();
  const t = frame / TL.fps;
  const active = TL.captions.filter((c) => !hidden.includes(c.scene) && t >= c.start - 0.03 && t < c.end + 0.12);
  if (!active.length) return null;
  const cap: Caption = active[active.length - 1];
  const st = STYLES[placement[cap.scene] ?? 'default'];
  const inF = frame - f(cap.start - 0.03);
  const p = interpolate(inF, [0, 7], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.2))});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: st.top,
          left: 70,
          right: 70,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          direction: 'rtl',
          gap: '0 22px',
          transform: `translateY(${(1 - p) * 40}px) scale(${0.85 + 0.15 * p})`,
          opacity: Math.min(1, p * 1.5),
        }}
      >
        {cap.words.map((w, i) => {
          const spoken = t >= w.start - 0.02;
          const current = spoken && t < w.end + 0.05;
          const wp = interpolate(frame - f(w.start), [0, 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const color = w.hl ? C.glow : C.white;
          return (
            <span
              key={i}
              style={{
                fontFamily: 'Heebo',
                fontWeight: 900,
                fontSize: st.size,
                lineHeight: 1.18,
                letterSpacing: -1,
                color: spoken ? color : 'rgba(244,251,250,0.42)',
                transform: `scale(${current ? 1 + 0.08 * (1 - Math.abs(wp - 0.5) * 2) + 0.04 : 1})`,
                textShadow: spoken && w.hl
                  ? `0 0 28px ${C.glow}aa, 0 6px 22px rgba(0,0,0,0.85)`
                  : '0 6px 22px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.6)',
                WebkitTextStroke: '1.5px rgba(0,0,0,0.25)',
                display: 'inline-block',
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

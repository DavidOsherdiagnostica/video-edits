import React from 'react';
import {Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../theme';

type Props = {
  src: string;
  video?: boolean;
  width: number;
  /** aspect = height / width */
  aspect: number;
  x?: number;
  y?: number;
  /** entrance starts at this local frame */
  at?: number;
  /** rotations at entrance end / at scene end (deg) */
  ry?: [number, number];
  rx?: [number, number];
  rz?: [number, number];
  z?: [number, number];
  dur: number;
  radius?: number;
  from?: 'bottom' | 'right' | 'left' | 'top' | 'depth';
  children?: React.ReactNode;
  glow?: boolean;
  startFrom?: number;
  playbackRate?: number;
};

/** A screenshot or screen recording floating as a glossy glass slab in 3D space. */
export const Card3D: React.FC<Props> = ({
  src, video, width, aspect, x = 540, y = 900, at = 0, ry = [-14, 8], rx = [10, 4], rz = [0, 0], z = [0, 120], dur,
  radius = 28, from = 'depth', children, glow = true, startFrom = 0, playbackRate = 1,
}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [at, at + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.exp)});
  const life = interpolate(frame, [at, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const off = {
    bottom: [0, 1400, 0], top: [0, -1400, 0], right: [1300, 0, 0], left: [-1300, 0, 0], depth: [0, 200, -2600],
  }[from];
  const h = width * aspect;
  const tx = off[0] * (1 - enter);
  const ty = off[1] * (1 - enter);
  const tz = off[2] * (1 - enter) + z[0] + (z[1] - z[0]) * life;
  const rotY = ry[0] + (ry[1] - ry[0]) * life + (1 - enter) * 35 * (from === 'right' ? -1 : 1);
  const rotX = rx[0] + (rx[1] - rx[0]) * life + (1 - enter) * 25;
  const rotZ = rz[0] + (rz[1] - rz[0]) * life;
  const sheen = interpolate(frame, [at + 6, at + 30], [-60, 160], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: `${x}px ${y}px`, opacity: Math.min(1, enter * 2)}}>
      <div
        style={{
          position: 'absolute',
          left: x - width / 2,
          top: y - h / 2,
          width,
          height: h,
          transformStyle: 'preserve-3d',
          transform: `translate3d(${tx}px, ${ty}px, ${tz}px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
        }}
      >
        {/* thickness */}
        <div style={{position: 'absolute', inset: 0, borderRadius: radius, background: C.teal, transform: 'translateZ(-14px)', filter: 'brightness(0.6)'}} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            overflow: 'hidden',
            background: '#fff',
            boxShadow: glow
              ? `0 0 0 2px ${C.mint}88, 0 40px 120px rgba(0,0,0,0.75), 0 0 90px ${C.glow}44`
              : '0 40px 120px rgba(0,0,0,0.75)',
          }}
        >
          {video ? (
            <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} playbackRate={playbackRate} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          ) : (
            <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          )}
          {children}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(115deg, transparent ${sheen - 20}%, rgba(255,255,255,0.35) ${sheen}%, transparent ${sheen + 12}%)`,
              mixBlendMode: 'screen',
            }}
          />
        </div>
      </div>
    </div>
  );
};

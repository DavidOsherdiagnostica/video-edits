import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {f, scene, segmentsOf} from '../timeline';
import {C} from '../theme';
import {glitchFilter, shake} from './Fx';

type Props = {
  sceneId: string;
  /** [localFrame, scale] keyframes; scale eases over 5 frames into each. */
  zooms?: [number, number][];
  /** Rendered between the footage and the person cut-out (text-behind-subject). */
  behind?: React.ReactNode;
  /** Rendered over everything inside the frame. */
  over?: React.ReactNode;
  shakes?: number[];
  glitches?: number[];
  dim?: number;
  grade?: 'warm' | 'cool' | 'mono';
};

const zoomAt = (frame: number, zooms: [number, number][]) => {
  let z = 1;
  for (const [at, s] of zooms) {
    if (frame >= at) {
      z = interpolate(frame, [at, at + 5], [z, s], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
    }
  }
  return z;
};

/** Every segment of a scene played back as 9:16 footage (dialog audio is mixed in Reel). */
export const TalkingHead: React.FC<Props> = ({sceneId, zooms = [], behind, over, shakes = [], glitches = [], dim = 0, grade = 'cool'}) => {
  const frame = useCurrentFrame();
  const sc = scene(sceneId);
  const segs = segmentsOf(sceneId);
  const total = f(sc.end) - f(sc.start);
  const drift = interpolate(frame, [0, total], [1.0, 1.06]);
  const z = zoomAt(frame, zooms) * drift;
  const sh = shakes.reduce((acc, at) => {
    const s = shake(frame, at);
    return {x: acc.x + s.x, y: acc.y + s.y, r: acc.r + s.r};
  }, {x: 0, y: 0, r: 0});
  const span = (i: number): [number, number] => {
    const from = f(segs[i].start) - f(sc.start);
    const next = segs[i + 1];
    return [from, (next ? f(next.start) - f(sc.start) : total) - from];
  };
  const gl = glitches.map((g) => glitchFilter(frame, g)).find(Boolean);
  const filter =
    grade === 'mono'
      ? 'grayscale(1) contrast(1.25) brightness(0.9)'
      : grade === 'warm'
        ? 'contrast(1.1) saturate(1.1) brightness(1.02) sepia(0.08)'
        : 'contrast(1.12) saturate(1.05) brightness(0.98) hue-rotate(-4deg)';

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <AbsoluteFill
        style={{
          transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(${z})`,
          transformOrigin: '50% 38%',
          filter: gl,
        }}
      >
        {segs.map((s, i) => (
          <Sequence key={s.file} from={span(i)[0]} durationInFrames={span(i)[1]} layout="none">
            {!s.audioOnly && (
              <AbsoluteFill>
                <OffthreadVideo src={staticFile(s.file)} muted style={{width: '100%', height: '100%', filter}} />
                <AbsoluteFill style={{background: C.ink, opacity: dim}} />
              </AbsoluteFill>
            )}
          </Sequence>
        ))}
        {behind && <AbsoluteFill style={{transform: `scale(${1 / z})`, transformOrigin: '50% 38%'}}>{behind}</AbsoluteFill>}
        {behind &&
          segs.map((s, i) =>
            s.fg ? (
              <Sequence key={s.fg} from={span(i)[0]} durationInFrames={span(i)[1]} layout="none">
                <OffthreadVideo src={staticFile(s.fg)} transparent muted style={{position: 'absolute', width: '100%', height: '100%', filter}} />
              </Sequence>
            ) : null,
          )}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(3,11,12,0.3) 0%, rgba(3,11,12,0) 22%, rgba(3,11,12,0) 55%, rgba(3,11,12,0.8) 100%)'}} />
      </AbsoluteFill>
      {over}
    </AbsoluteFill>
  );
};

/** Lower-third name tag in the reel's own style. */
export const NameTag: React.FC<{name: string; role: string; at?: number}> = ({name, role, at = 6}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.exp)});
  return (
    <div
      style={{
        position: 'absolute',
        top: 250,
        right: 70,
        direction: 'rtl',
        display: 'flex',
        alignItems: 'stretch',
        gap: 18,
        opacity: p,
        transform: `translateX(${(1 - p) * 80}px)`,
      }}
    >
      <div style={{width: 8, borderRadius: 4, background: `linear-gradient(${C.glow}, ${C.teal})`, transform: `scaleY(${p})`}} />
      <div style={{fontFamily: 'Heebo', color: C.white}}>
        <div style={{fontSize: 54, fontWeight: 900, lineHeight: 1.05, textShadow: '0 4px 20px rgba(0,0,0,0.6)'}}>{name}</div>
        <div style={{fontSize: 34, fontWeight: 500, color: C.mint, textShadow: '0 3px 14px rgba(0,0,0,0.7)'}}>{role}</div>
      </div>
    </div>
  );
};

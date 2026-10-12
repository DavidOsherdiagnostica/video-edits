import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {interpolate, random, useCurrentFrame, Easing} from 'remotion';
import * as THREE from 'three';
import {PAGES, useTextures} from './three-utils';
import {C} from '../theme';

const COUNT = 70;

/** Hundreds of scanned regulator filings tumbling past the camera. */
export const PaperStorm: React.FC<{dur: number; speed?: number; converge?: boolean}> = ({dur, speed = 1, converge = false}) => {
  const frame = useCurrentFrame();
  const tex = useTextures(PAGES);
  const pages = useMemo(
    () =>
      new Array(COUNT).fill(0).map((_, i) => ({
        x: (random(`px${i}`) - 0.5) * 9,
        y: (random(`py${i}`) - 0.5) * 14,
        z: -random(`pz${i}`) * 70,
        rx: random(`rx${i}`) * Math.PI * 2,
        ry: random(`ry${i}`) * Math.PI * 2,
        vr: (random(`vr${i}`) - 0.5) * 0.08,
        tex: i % PAGES.length,
        s: 0.9 + random(`s${i}`) * 0.7,
      })),
    [],
  );
  if (!tex) return null;
  const t = frame / 30;
  const camZ = 8 - interpolate(frame, [0, dur], [0, 34 * speed], {easing: Easing.inOut(Easing.quad)});
  return (
    <ThreeCanvas width={1080} height={1920} camera={{position: [0, 0, 8], fov: 60}}>
      <color attach="background" args={[C.ink]} />
      <fog attach="fog" args={[C.ink, 6, 38]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 4, 6]} intensity={2.2} color={C.mint} />
      <group position={[0, 0, -camZ + 8]}>
        {pages.map((p, i) => {
          const conv = converge ? interpolate(frame, [dur * 0.55, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)}) : 0;
          const swirl = t * 0.6 + i;
          const x = p.x * (1 - conv) + Math.sin(swirl) * 0.3;
          const y = p.y * (1 - conv) + Math.cos(swirl * 0.8) * 0.3;
          return (
            <mesh
              key={i}
              position={[x, y, p.z]}
              rotation={[p.rx + frame * p.vr, p.ry + frame * p.vr * 0.7, frame * p.vr * 0.5]}
              scale={p.s}
            >
              <planeGeometry args={[1.414 * 0.707 * 1.6, 1.414 * 1.6]} />
              <meshBasicMaterial map={tex[p.tex] as THREE.Texture} side={THREE.DoubleSide} color={i % 3 ? '#e4eeed' : '#ffffff'} />
            </mesh>
          );
        })}
      </group>
    </ThreeCanvas>
  );
};

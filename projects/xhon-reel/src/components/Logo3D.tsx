import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {SVGLoader} from 'three/examples/jsm/loaders/SVGLoader.js';
import {useText} from './three-utils';
import {C} from '../theme';

const SCALE = 0.0085;

/** Procedural studio matcap: chrome-like shading without an environment map. */
const makeMatcap = (base: string, rim: string, hi: string) => {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  const add = (x: number, y: number, r0: number, r1: number, stops: [number, string][]) => {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
  };
  add(256, 256, 120, 256, [[0, 'rgba(0,0,0,0)'], [0.75, `${rim}00`], [0.95, rim], [1, rim]]);
  add(330, 420, 0, 220, [[0, `${rim}aa`], [1, `${rim}00`]]);
  add(180, 150, 0, 170, [[0, hi], [0.35, `${hi}aa`], [1, `${hi}00`]]);
  add(150, 120, 0, 40, [[0, '#ffffff'], [1, '#ffffff00']]);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Rebuild a transformed <rect> by hand; SVGLoader's output for these breaks the extrusion. */
const rectShape = (node: Element) => {
  const w = parseFloat(node.getAttribute('width') ?? '0');
  const h = parseFloat(node.getAttribute('height') ?? '0');
  const x = parseFloat(node.getAttribute('x') ?? '0');
  const y = parseFloat(node.getAttribute('y') ?? '0');
  const tr = node.getAttribute('transform') ?? '';
  const t = /translate\(([-\d.e]+)[ ,]+([-\d.e]+)\)/.exec(tr);
  const r = /rotate\(([-\d.e]+)\)/.exec(tr);
  const tx = t ? parseFloat(t[1]) : 0;
  const ty = t ? parseFloat(t[2]) : 0;
  const a = ((r ? parseFloat(r[1]) : 0) * Math.PI) / 180;
  const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => new THREE.Vector2(
    tx + px * Math.cos(a) - py * Math.sin(a),
    ty + px * Math.sin(a) + py * Math.cos(a),
  ));
  if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
  return new THREE.Shape(pts);
};

type Piece = {geo: THREE.ExtrudeGeometry; arrow: boolean; cx: number; idx: number};

const usePieces = (svg: string | null) =>
  useMemo<Piece[]>(() => {
    if (!svg) return [];
    const data = new SVGLoader().parse(svg);
    return data.paths.flatMap((path, idx) => {
      const node = path.userData?.node as Element | undefined;
      const arrow = !!node?.getAttribute('transform')?.startsWith('translate');
      const shapes = arrow && node ? [rectShape(node)] : SVGLoader.createShapes(path);
      return shapes.map((shape) => {
        const geo = new THREE.ExtrudeGeometry(shape, {depth: 22, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.2, bevelSegments: 4, curveSegments: 24});
        geo.computeBoundingBox();
        const bb = geo.boundingBox!;
        return {geo, arrow, cx: (bb.min.x + bb.max.x) / 2, idx};
      });
    });
  }, [svg]);

/** The XHON wordmark extruded in chrome, assembling letter by letter, the arrow landing last. */
export const Logo3D: React.FC<{dur: number; settle?: number}> = ({dur, settle = 0}) => {
  const frame = useCurrentFrame();
  const svg = useText('img/logo-dark.svg');
  const pieces = usePieces(svg);
  const chrome = useMemo(() => makeMatcap('#10282a', '#9fe9df', '#ffffff'), []);
  const glass = useMemo(() => makeMatcap('#0f4f4b', '#6ff2df', '#d8fff8'), []);
  const rot = interpolate(frame, [0, 26], [-0.9, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}) +
    interpolate(frame, [26, dur], [0, 0.12 * (1 - settle)]);
  const camZ = interpolate(frame, [0, dur], [11, 9.6], {easing: Easing.out(Easing.quad)});
  const sweep = interpolate(frame, [10, 40], [-6, 6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (!pieces.length) return null;
  return (
    <ThreeCanvas width={1080} height={1920} camera={{position: [0, 0, camZ], fov: 40}}>
      <ambientLight intensity={0.2} />
      <pointLight position={[sweep, 2, 4]} intensity={80} color={C.glow} distance={20} />
      <directionalLight position={[-3, 5, 6]} intensity={1.5} />
      <group rotation={[0.08, rot, 0]}>
      <group scale={[SCALE, -SCALE, SCALE]} position={[-196 * SCALE, 39 * SCALE, 0]}>
        {pieces.map((p, i) => {
          const order = p.arrow ? 6 : p.cx / 80;
          const st = p.arrow ? 22 : 2 + order * 3;
          const k = interpolate(frame, [st, st + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4))});
          const fromV = p.arrow ? [260, -260, 300] : [0, 0, -900];
          return (
            <mesh
              key={i}
              geometry={p.geo}
              position={[fromV[0] * (1 - k), fromV[1] * (1 - k), fromV[2] * (1 - k)]}
              scale={p.arrow ? 1 : 0.3 + 0.7 * k}
            >
              {p.arrow ? (
                <meshMatcapMaterial matcap={glass} />
              ) : (
                <meshMatcapMaterial matcap={chrome} />
              )}
            </mesh>
          );
        })}
      </group>
      </group>
    </ThreeCanvas>
  );
};

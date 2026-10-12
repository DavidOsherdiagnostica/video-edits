import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {C} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** One piece of the dark-mode wordmark, flying in from depth or from the top-right. */
const Piece: React.FC<{start: number; arrow?: boolean; cx: number; cy: number; children: React.ReactNode}> = ({start, arrow, cx, cy, children}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [start, start + 12], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))});
  const o = interpolate(frame, [start, start + 5], [0, 1], clamp);
  const t = arrow
    ? `translate(${90 * (1 - k)} ${-90 * (1 - k)})`
    : `translate(${cx} ${cy}) scale(${2.4 - 1.4 * k}) translate(${-cx} ${-cy})`;
  return (
    <g transform={t} opacity={o}>
      {children}
    </g>
  );
};

/**
 * The XHON wordmark (dark-mode artwork, kept flat for the brand) assembling
 * letter by letter, the arrow landing last, with a light sweep across it.
 */
export const Logo2D: React.FC<{dur: number; width?: number; y?: number}> = ({dur, width = 760, y = 900}) => {
  const frame = useCurrentFrame();
  const h = (width * 79) / 393;
  const settle = interpolate(frame, [0, dur], [1.04, 1], {easing: Easing.out(Easing.quad)});
  const sweep = interpolate(frame, [30, 52], [-30, 130], clamp);
  const glow = interpolate(frame, [30, 40], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 540 - width / 2,
        top: y - h / 2,
        width,
        height: h,
        transform: `scale(${settle})`,
        filter: `drop-shadow(0 0 ${36 * glow}px ${C.glow}55)`,
      }}
    >
      <svg width={width} height={h} viewBox="0 0 393 79" style={{overflow: 'visible'}}>
        <defs>
          <clipPath id="vb" clipPathUnits="userSpaceOnUse">
            <rect x="0" y="0" width="393" height="79" />
          </clipPath>
          <linearGradient id="arrowA" x1="6.19524" y1="32.9127" x2="5.80812" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2D6A6A" />
            <stop offset="1" stopColor="#A6DADA" />
          </linearGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0.3">
            <stop offset={`${Math.max(0, sweep - 12)}%`} stopColor="#fff" stopOpacity="0" />
            <stop offset={`${Math.max(0, sweep)}%`} stopColor="#fff" stopOpacity="0.85" />
            <stop offset={`${Math.max(0, sweep + 12)}%`} stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="letters">
            <rect x="-10" y="-10" width="420" height="100" fill="black" />
            <g fill="white" clipPath="url(#vb)">
              <Glyphs />
            </g>
          </mask>
        </defs>
        <Piece start={2} cx={35} cy={45}>
          <g clipPath="url(#vb)">
            <rect y="10.7105" width="13.471" height="89.7763" transform="rotate(-41.1409 0 10.7105)" fill="white" />
            <rect x="58.3462" y="1.39734" width="13.471" height="89.7763" transform="rotate(40.0702 58.3462 1.39734)" fill="white" />
          </g>
        </Piece>
        <Piece start={5} cx={114} cy={39}>
          <path d="M145.181 0.996836V77.9747H132.555V45.6069H96.3365V77.9747H83.71V0.996836H96.3365V32.7001H132.555V0.996836H145.181Z" fill="white" />
        </Piece>
        <Piece start={8} cx={202} cy={39}>
          <path d="M201.813 78.75C179.707 78.75 162.493 61.0621 162.493 39.3196C162.493 17.403 180.149 0 201.813 0C223.858 0 241.132 17.6129 241.132 39.3196C241.132 61.3867 223.605 78.75 201.813 78.75ZM201.813 67.7848C217.945 67.7848 228.173 54.5362 228.173 39.3196C228.173 23.8149 217.568 11.076 201.813 11.076C185.674 11.076 175.452 24.0862 175.452 39.3196C175.452 54.8663 185.946 67.7848 201.813 67.7848Z" fill="white" />
        </Piece>
        <Piece start={11} cx={288} cy={39}>
          <path d="M320.124 77.9747H307.497L269.507 23.0966V77.9747H256.88V0.886078H269.507L307.497 55.6534V0.886078H320.124V77.9747Z" fill="white" />
        </Piece>
        <Piece start={20} arrow cx={366} cy={26}>
          <g clipPath="url(#vb)">
            <rect width="11.6162" height="50.3371" transform="translate(392.363 51.1978) rotate(180)" fill="url(#arrowA)" />
            <rect width="11.6162" height="50.3371" transform="translate(342.026 12.4769) rotate(-90)" fill="url(#arrowA)" />
            <rect width="11.6163" height="65.7357" transform="translate(345.593 55.5567) rotate(-135)" fill="#2D6A6A" />
          </g>
        </Piece>
        {frame >= 30 && <rect x="-10" y="-10" width="420" height="100" fill="url(#sweep)" mask="url(#letters)" />}
      </svg>
    </div>
  );
};

const Glyphs: React.FC = () => (
  <>
    <rect y="10.7105" width="13.471" height="89.7763" transform="rotate(-41.1409 0 10.7105)" />
    <rect x="58.3462" y="1.39734" width="13.471" height="89.7763" transform="rotate(40.0702 58.3462 1.39734)" />
    <path d="M145.181 0.996836V77.9747H132.555V45.6069H96.3365V77.9747H83.71V0.996836H96.3365V32.7001H132.555V0.996836H145.181Z" />
    <path d="M201.813 78.75C179.707 78.75 162.493 61.0621 162.493 39.3196C162.493 17.403 180.149 0 201.813 0C223.858 0 241.132 17.6129 241.132 39.3196C241.132 61.3867 223.605 78.75 201.813 78.75ZM201.813 67.7848C217.945 67.7848 228.173 54.5362 228.173 39.3196C228.173 23.8149 217.568 11.076 201.813 11.076C185.674 11.076 175.452 24.0862 175.452 39.3196C175.452 54.8663 185.946 67.7848 201.813 67.7848Z" />
    <path d="M320.124 77.9747H307.497L269.507 23.0966V77.9747H256.88V0.886078H269.507L307.497 55.6534V0.886078H320.124V77.9747Z" />
  </>
);

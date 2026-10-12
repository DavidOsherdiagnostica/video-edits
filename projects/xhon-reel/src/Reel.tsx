import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {C} from './theme';
import {f, local, scene, TL, wordAt} from './timeline';
import {useFonts} from './components/Fonts';
import {Grain, SceneIn} from './components/Fx';
import {Captions} from './components/Captions';
import * as S from './scenes/Scenes';

const SCENES: Record<string, {C: React.FC; rotate?: number; from?: number}> = {
  hook: {C: S.Hook, from: 1.0},
  jaw: {C: S.Jaw},
  count: {C: S.Count, rotate: -2},
  pdf: {C: S.Pdf},
  army: {C: S.Army, rotate: 2},
  logo: {C: S.Logo, from: 1.25},
  hero: {C: S.Hero},
  chat: {C: S.Chat},
  twothings: {C: S.TwoThings, rotate: -2},
  noai: {C: S.NoAI},
  trust: {C: S.Trust, rotate: 2},
  speed: {C: S.Speed},
  nothours: {C: S.NotHours, from: 1.3},
  skeletons: {C: S.Skeletons, rotate: -3},
  deal: {C: S.Deal},
  samesum: {C: S.SameSum, from: 1.2},
  usa: {C: S.Usa},
  info: {C: S.Info},
  crazy: {C: S.Crazy, rotate: 2},
  end: {C: S.End, from: 1.0},
};

const HIDDEN = ['count', 'pdf', 'chat', 'twothings', 'nothours', 'skeletons', 'logo', 'end'];
const PLACEMENT = {hook: 'hero', hero: 'low', trust: 'low', speed: 'low', deal: 'low', usa: 'low'} as const;

type Sfx = {file: string; at: number; vol?: number};

const sfxList = (): Sfx[] => {
  const s = (id: string) => scene(id).start;
  const w = (id: string, word: string, nth = 0) => wordAt(id, word, nth);
  const list: Sfx[] = [
    {file: 'whoosh-long', at: 0, vol: 0.5},
    {file: 'paper', at: 0.1, vol: 0.5},
    {file: 'paper', at: 1.6, vol: 0.35},
    {file: 'impact', at: w('hook', 'מאה') - 0.05, vol: 0.45},
    {file: 'whoosh-fast', at: s('jaw') - 0.15, vol: 0.5},
    {file: 'glitch', at: w('jaw', 'נפלה'), vol: 0.4},
    {file: 'impact', at: w('jaw', 'נפלה'), vol: 0.5},
    {file: 'whoosh', at: s('count') - 0.2, vol: 0.45},
    {file: 'riser-short', at: w('count', '5,000') - 0.3, vol: 0.35},
    {file: 'impact', at: w('count', 'דיווחים') + 0.2, vol: 0.5},
    {file: 'paper', at: s('pdf'), vol: 0.5},
    {file: 'whoosh', at: s('pdf') - 0.2, vol: 0.4},
    {file: 'pop', at: w('pdf', 'PDF'), vol: 0.5},
    {file: 'pop', at: w('pdf', 'טבלאות'), vol: 0.5},
    {file: 'whoosh-fast', at: s('army') - 0.15, vol: 0.45},
    {file: 'impact', at: w('army', 'צבא'), vol: 0.4},
    {file: 'subdrop', at: w('army', 'סיכוי') - 0.25, vol: 0.5},
    {file: 'impact', at: s('logo'), vol: 0.7},
    {file: 'subdrop', at: s('logo'), vol: 0.6},
    {file: 'shimmer', at: s('logo') + 0.75, vol: 0.4},
    {file: 'whoosh', at: s('hero') - 0.2, vol: 0.45},
    {file: 'whoosh-fast', at: s('hero') + 0.3, vol: 0.3},
    {file: 'whoosh-fast', at: s('chat') - 0.1, vol: 0.4},
    {file: 'whoosh', at: s('twothings') - 0.2, vol: 0.4},
    {file: 'pop', at: w('twothings', 'עדכניות') - 0.1, vol: 0.5},
    {file: 'pop', at: w('twothings', 'דיוק') - 0.1, vol: 0.5},
    {file: 'whoosh-fast', at: s('noai') - 0.15, vol: 0.45},
    {file: 'glitch', at: w('noai', 'בכלל') + 0.1, vol: 0.45},
    {file: 'impact', at: w('noai', 'בכלל') + 0.1, vol: 0.4},
    {file: 'whoosh', at: s('trust') - 0.2, vol: 0.45},
    {file: 'pop', at: w('trust', 'למקור') - 0.1, vol: 0.5},
    {file: 'tick', at: w('trust', 'אסמכתא'), vol: 0.5},
    {file: 'shimmer', at: w('trust', 'אסמכתא'), vol: 0.3},
    {file: 'whoosh', at: s('speed') - 0.2, vol: 0.45},
    {file: 'impact', at: w('nothours', 'שעות'), vol: 0.55},
    {file: 'impact', at: w('nothours', 'ימים'), vol: 0.55},
    {file: 'impact', at: w('nothours', 'שבועות'), vol: 0.65},
    {file: 'whoosh-long', at: s('skeletons') - 0.3, vol: 0.45},
    {file: 'glitch', at: w('skeletons', 'שלדים'), vol: 0.5},
    {file: 'whoosh', at: s('deal') - 0.2, vol: 0.4},
    {file: 'pop', at: w('deal', 'בת') - 0.2, vol: 0.5},
    {file: 'pop', at: w('deal', 'האם') - 0.15, vol: 0.5},
    {file: 'riser-short', at: w('deal', 'דיבידנד') - 0.4, vol: 0.3},
    {file: 'impact', at: w('samesum', 'סכום') - 0.07, vol: 0.65},
    {file: 'subdrop', at: w('samesum', 'סכום') - 0.07, vol: 0.5},
    {file: 'whoosh-long', at: s('usa') - 0.3, vol: 0.45},
    {file: 'pop', at: w('usa', 'ובארץ'), vol: 0.45},
    {file: 'whoosh', at: s('info') - 0.2, vol: 0.4},
    {file: 'shimmer', at: w('info', 'מידע'), vol: 0.4},
    {file: 'whoosh-fast', at: s('crazy') - 0.15, vol: 0.4},
    {file: 'impact', at: w('crazy', 'משוגע') - 0.07, vol: 0.45},
    {file: 'impact', at: s('end'), vol: 0.6},
    {file: 'shimmer', at: s('end') + 0.8, vol: 0.45},
  ];
  // stopwatch ticks
  for (let t = w('speed', 'תוך'); t < w('speed', 'בודדות') + 0.2; t += 0.1) list.push({file: 'tick', at: t, vol: 0.18});
  // counter ticks
  for (let t = w('count', '5,000') - 0.13; t < w('count', 'דיווחים') + 0.2; t += 0.07) list.push({file: 'tick', at: t, vol: 0.12});
  // typing
  TL.captions.filter((c) => c.scene === 'chat').flatMap((c) => c.words).forEach((wd) => {
    for (let k = 0; k < Math.min(wd.text.length, 5); k++) list.push({file: 'key', at: wd.start + k * 0.05, vol: 0.25});
  });
  list.push({file: 'pop', at: scene('chat').start + (local('chat', TL.segments.find((x) => x.scene === 'chat')!.start + TL.segments.find((x) => x.scene === 'chat')!.dur) - 4) / TL.fps, vol: 0.55});
  return list;
};

export const Reel: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{background: C.ink}}>
      {TL.scenes.map((sc) => {
        const def = SCENES[sc.id];
        const Comp = def.C;
        return (
          <Sequence key={sc.id} from={f(sc.start)} durationInFrames={f(sc.end) - f(sc.start)} name={sc.id}>
            <SceneIn rotate={def.rotate ?? 0} from={def.from ?? 1.12}>
              <Comp />
            </SceneIn>
          </Sequence>
        );
      })}
      <Captions hidden={HIDDEN} placement={PLACEMENT} />
      <Grain />

      {/* dialog */}
      {TL.segments.map((s) => (
        <Sequence key={s.file} from={f(s.start)} durationInFrames={f(s.dur) + 2} layout="none">
          <Audio src={staticFile(s.file)} volume={1} />
        </Sequence>
      ))}
      {/* music */}
      <Audio src={staticFile('music.wav')} volume={0.55} />
      {/* sfx */}
      {sfxList().map((x, i) => (
        <Sequence key={i} from={Math.max(0, f(x.at))} layout="none">
          <Audio src={staticFile(`sfx/${x.file}.wav`)} volume={x.vol ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

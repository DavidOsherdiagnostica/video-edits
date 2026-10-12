import timeline from '../data/timeline.json';

export type Word = {text: string; start: number; end: number; hl: boolean};
export type Caption = {start: number; end: number; words: Word[]; scene: string; spk: string};
export type Segment = {
  scene: string;
  clip: string;
  part: number;
  start: number;
  dur: number;
  file: string;
  fg: string | null;
  audioOnly: boolean;
  spk: string;
};
export type Scene = {id: string; start: number; end: number};

export const FPS = timeline.fps;
export const TL = timeline as {
  fps: number;
  bpm: number;
  duration: number;
  scenes: Scene[];
  segments: Segment[];
  captions: Caption[];
};

export const f = (sec: number) => Math.round(sec * FPS);

export const scene = (id: string): Scene => {
  const s = TL.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`no scene ${id}`);
  return s;
};

export const segmentsOf = (id: string) => TL.segments.filter((s) => s.scene === id);

export const captionsOf = (id: string) => TL.captions.filter((c) => c.scene === id);

/** Absolute time (s) a word starts, searched within a scene; falls back to the scene start. */
export const wordAt = (sceneId: string, text: string, nth = 0): number => {
  const words = captionsOf(sceneId).flatMap((c) => c.words);
  const hits = words.filter((w) => w.text.includes(text));
  return (hits[nth] ?? hits[0])?.start ?? scene(sceneId).start;
};

/** Frame inside a scene's Sequence for an absolute time. */
export const local = (sceneId: string, sec: number) => f(sec) - f(scene(sceneId).start);

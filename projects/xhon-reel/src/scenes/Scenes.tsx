import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {captionsOf, f, local, scene, segmentsOf, wordAt} from '../timeline';
import {Backdrop, glitchFilter, pop, shake} from '../components/Fx';
import {NameTag, TalkingHead} from '../components/TalkingHead';
import {Card3D} from '../components/Card3D';
import {PaperStorm} from '../components/PaperStorm';
import {Logo2D} from '../components/Logo2D';
import {PAGES} from '../components/three-utils';

const len = (id: string) => f(scene(id).end) - f(scene(id).start);
const at = (id: string, word: string, nth = 0) => local(id, wordAt(id, word, nth));
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = (frame: number, a: number, b: number, e = Easing.out(Easing.exp)) =>
  interpolate(frame, [a, b], [0, 1], {...clamp, easing: e});

const BigText: React.FC<{
  children: React.ReactNode;
  top: number;
  size: number;
  appear: number;
  color?: string;
  outline?: boolean;
  font?: string;
  weight?: number;
  spacing?: number;
  style?: React.CSSProperties;
}> = ({children, top, size, appear, color = C.white, outline, font = FONT.he, weight = 900, spacing = -4, style}) => {
  const frame = useCurrentFrame();
  const s = pop(frame, appear, 10);
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: -200,
        right: -200,
        textAlign: 'center',
        direction: 'rtl',
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 0.95,
        letterSpacing: spacing,
        color: outline ? 'transparent' : color,
        WebkitTextStroke: outline ? `4px ${color}` : undefined,
        textShadow: outline ? undefined : `0 0 60px ${C.glow}55, 0 20px 60px rgba(0,0,0,0.5)`,
        transform: `scale(${s})`,
        opacity: frame < appear ? 0 : 1,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Chip: React.FC<{children: React.ReactNode; x: number; y: number; appear: number; size?: number; accent?: string}> = ({
  children, x, y, appear, size = 56, accent = C.glow,
}) => {
  const frame = useCurrentFrame();
  const s = pop(frame, appear, 9);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${s})`,
        opacity: frame < appear ? 0 : 1,
        padding: '22px 40px',
        borderRadius: 999,
        background: 'rgba(6, 23, 26, 0.72)',
        border: `2px solid ${accent}`,
        boxShadow: `0 0 50px ${accent}55, inset 0 0 30px ${accent}22`,
        backdropFilter: 'blur(14px)',
        color: C.white,
        fontFamily: FONT.he,
        fontWeight: 800,
        fontSize: size,
        direction: 'rtl',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
};

/** Solid brand pill: a white disc with the number, the word beside it. */
const NumPill: React.FC<{n: number; x: number; y: number; appear: number; children: React.ReactNode}> = ({n, x, y, appear, children}) => {
  const frame = useCurrentFrame();
  const s = pop(frame, appear, 9);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${s})`,
        opacity: frame < appear ? 0 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 30,
        direction: 'rtl',
        padding: '18px 60px 18px 18px',
        minWidth: 520,
        boxSizing: 'border-box',
        borderRadius: 999,
        background: `linear-gradient(135deg, ${C.tealBright}, ${C.teal})`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 60px ${C.glow}44`,
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          background: C.white,
          color: C.teal,
          fontFamily: FONT.num,
          fontWeight: 700,
          fontSize: 76,
          lineHeight: '120px',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div style={{fontFamily: FONT.he, fontWeight: 900, fontSize: 84, color: C.white, whiteSpace: 'nowrap'}}>{children}</div>
    </div>
  );
};

const Strike: React.FC<{appear: number; width: number; top: number; color?: string}> = ({appear, width, top, color = C.glow}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, appear, appear + 6, Easing.out(Easing.cubic));
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 540 - width / 2,
        width: width * p,
        height: 22,
        borderRadius: 11,
        background: color,
        boxShadow: `0 0 40px ${color}`,
        transform: 'rotate(-6deg)',
        transformOrigin: 'left center',
      }}
    />
  );
};

const count = (frame: number, a: number, b: number, to: number) =>
  Math.round(interpolate(frame, [a, b], [0, to], {...clamp, easing: Easing.out(Easing.cubic)}));

/* ---------------------------------------------------------------- scenes */

export const Hook: React.FC = () => {
  const d = len('hook');
  const hundred = at('hook', 'מאה');
  return (
    <AbsoluteFill>
      <PaperStorm dur={d} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 40% at 50% 47%, rgba(3,11,12,0.75) 0%, rgba(3,11,12,0) 100%)'}} />
      <BigText top={330} size={300} appear={hundred} font={FONT.display} color={C.glow} outline spacing={0}>
        100
      </BigText>
    </AbsoluteFill>
  );
};

export const Jaw: React.FC = () => {
  const hit = at('jaw', 'נפלה');
  return (
    <TalkingHead
      sceneId="jaw"
      zooms={[[0, 1.0], [f(segmentsOf('jaw')[1].start) - f(scene('jaw').start), 1.1], [hit, 1.28]]}
      shakes={[hit]}
      glitches={[hit]}
      over={<NameTag name="דוד אושר" role="מייסד XHON" />}
    />
  );
};

export const Count: React.FC = () => {
  const frame = useCurrentFrame();
  const a = at('count', '5,000');
  const b = at('count', 'דיווחים');
  const n = count(frame, a - 4, b + 6, 5000);
  return (
    <TalkingHead
      sceneId="count"
      zooms={[[0, 1.0]]}
      shakes={[b + 6]}
      behind={
        <BigText top={90} size={180} appear={a - 4} font={FONT.display} color={C.glow} spacing={-6} style={{direction: 'ltr'}}>
          {n.toLocaleString('en-US')}+
        </BigText>
      }
      over={
        <>
          <Chip x={540} y={1300} appear={b - 2} size={74}>
            דיווחים בחודש
          </Chip>
          <div
            style={{
              position: 'absolute',
              top: 1390,
              width: '100%',
              textAlign: 'center',
              fontFamily: FONT.he,
              fontSize: 40,
              fontWeight: 500,
              color: C.mint,
              opacity: ease(frame, b + 6, b + 16),
            }}
          >
            למערכת מאגנא של רשות ניירות ערך
          </div>
        </>
      }
    />
  );
};

export const Pdf: React.FC = () => {
  const frame = useCurrentFrame();
  const d = len('pdf');
  const pdfAt = at('pdf', 'PDF');
  const two = at('pdf', '200');
  const tables = at('pdf', 'טבלאות');
  const spread = ease(frame, 0, d, Easing.inOut(Easing.cubic));
  const pages = PAGES.slice(4, 16);
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{position: 'absolute', inset: 0, perspective: 1800, perspectiveOrigin: '540px 980px'}}>
        <div
          style={{
            position: 'absolute',
            left: 540 - 300,
            top: 980 - 424,
            width: 600,
            height: 848,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${24 - spread * 10}deg) rotateY(${-38 + spread * 70}deg) rotateZ(${-8 + spread * 6}deg)`,
          }}
        >
          {pages.map((p, i) => {
            const k = ease(frame, i * 1.5, i * 1.5 + 14);
            const zz = (i - pages.length / 2) * (16 + spread * 60);
            return (
              <Img
                key={p}
                src={staticFile(p)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: 600,
                  height: 848,
                  borderRadius: 10,
                  boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
                  transform: `translate3d(${(1 - k) * 900 * (i % 2 ? 1 : -1)}px, ${(1 - k) * -600}px, ${zz}px) rotateZ(${(random(`pz${i}`) - 0.5) * 10 * spread}deg)`,
                  opacity: k,
                }}
              />
            );
          })}
        </div>
      </div>
      <Chip x={540} y={330} appear={pdfAt - 2} size={64} accent="#FF5A5A">
        <span style={{color: '#FF8A8A', fontFamily: FONT.num, fontWeight: 700}}>PDF</span> של{' '}
        <span style={{fontFamily: FONT.num, fontWeight: 700}}>{count(frame, two - 6, two + 10, 200)}</span> עמודים
      </Chip>
      <Chip x={540} y={1520} appear={tables - 2} size={64}>
        + טבלאות
      </Chip>
    </AbsoluteFill>
  );
};

export const Army: React.FC = () => {
  const frame = useCurrentFrame();
  const army = at('army', 'צבא');
  const chance = at('army', 'סיכוי');
  const out = ease(frame, chance - 12, chance - 4);
  return (
    <TalkingHead
      sceneId="army"
      zooms={[[0, 1.0], [chance - 8, 1.22]]}
      shakes={[chance - 8]}
      behind={
        <div style={{opacity: 1 - out}}>
          <BigText top={60} size={330} appear={army - 2} color={C.glow}>
            צבא
          </BigText>
        </div>
      }
    />
  );
};

export const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const d = len('logo');
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 46%, ${C.glow}33 0%, transparent 45%)`, opacity: ease(frame, 18, 30)}} />
      <Logo2D dur={d} y={940} />
      <div
        style={{
          position: 'absolute',
          top: 1120,
          width: '100%',
          textAlign: 'center',
          direction: 'rtl',
          fontFamily: FONT.he,
          fontWeight: 300,
          fontSize: 58,
          letterSpacing: 2,
          color: C.white,
          opacity: ease(frame, 28, 40),
          transform: `translateY(${(1 - ease(frame, 28, 40)) * 30}px)`,
        }}
      >
        מודיעין פיננסי <b style={{fontWeight: 900, color: C.glow}}>בזמן אמת</b>
      </div>
    </AbsoluteFill>
  );
};

export const Hero: React.FC = () => {
  const d = len('hero');
  const gpt = at('hero', 'ChatGPT');
  return (
    <AbsoluteFill>
      <Backdrop />
      <Card3D src="img/chat-screen.jpg" width={900} aspect={915 / 1910} x={560} y={1120} at={10} from="right" ry={[16, 6]} rx={[8, 2]} z={[-260, -120]} dur={d} />
      <Card3D src="img/hero.jpg" width={980} aspect={827 / 1639} x={540} y={720} at={0} ry={[-20, -4]} rx={[12, 4]} z={[0, 140]} dur={d} />
      <Chip x={540} y={330} appear={gpt - 2} size={58}>
        ממש כמו <span style={{fontFamily: FONT.num, fontWeight: 700}}>ChatGPT</span>
      </Chip>
    </AbsoluteFill>
  );
};

export const Chat: React.FC = () => {
  const frame = useCurrentFrame();
  const d = len('chat');
  const segs = segmentsOf('chat');
  const words = captionsOf('chat').flatMap((c) => c.words);
  let typed = '';
  words.forEach((w, i) => {
    const st = local('chat', w.start);
    const en = words[i + 1] ? local('chat', words[i + 1].start) : local('chat', w.end);
    if (frame >= st) {
      const n = Math.ceil(interpolate(frame, [st, Math.max(st + 1, en - 1)], [0, w.text.length], clamp));
      typed += (typed ? ' ' : '') + w.text.slice(0, n);
    }
  });
  const speechEnd = f(segs[0].start + segs[0].dur) - f(scene('chat').start);
  const send = speechEnd - 4;
  const press = frame >= send && frame < send + 6 ? 0.85 : 1;
  const answer = send + 6;
  const lift = ease(frame, answer, answer + 14);
  return (
    <AbsoluteFill>
      <Backdrop />
      <div style={{position: 'absolute', inset: 0, perspective: 1600}}>
        <div
          style={{
            position: 'absolute',
            left: 70,
            width: 940,
            top: 760 - lift * 420,
            height: 300,
            borderRadius: 40,
            background: '#ffffff',
            boxShadow: `0 0 0 3px ${C.mint}, 0 0 120px ${C.glow}55, 0 40px 120px rgba(0,0,0,0.6)`,
            transform: `rotateX(${10 - ease(frame, 0, 20) * 10 + lift * 6}deg) scale(${0.9 + ease(frame, 0, 14) * 0.1 - lift * 0.08})`,
            opacity: ease(frame, 0, 8),
          }}
        >
          <div style={{position: 'absolute', top: 54, right: 60, left: 60, direction: 'rtl', fontFamily: FONT.he, fontSize: 56, fontWeight: 500, color: '#1d2b2b', lineHeight: 1.25}}>
            {typed || <span style={{color: '#9aa'}}>שאלו על דוחות, ישויות או מגמות...</span>}
            <span style={{display: 'inline-block', width: 4, height: 60, marginRight: 6, background: C.teal, verticalAlign: 'middle', opacity: Math.floor(frame / 8) % 2 ? 1 : 0}} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 40,
              bottom: 36,
              width: 96,
              height: 96,
              borderRadius: 48,
              background: C.teal,
              transform: `scale(${press})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: frame >= send ? `0 0 40px ${C.glow}` : undefined,
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
        </div>
      </div>
      <Card3D src="img/financials.jpg" width={900} aspect={710 / 904} x={540} y={1180} at={answer} from="bottom" ry={[-8, 4]} rx={[14, 6]} z={[0, 60]} dur={d} />
      <Chip x={540} y={250} appear={4} size={40}>
        <Img src={staticFile('img/mcp.png')} style={{width: 44, height: 44, verticalAlign: 'middle', marginLeft: 14, filter: 'invert(1)'}} />
        מחובר ישירות למאגנא דרך <span style={{fontFamily: FONT.num}}>MCP</span>
      </Chip>
    </AbsoluteFill>
  );
};

export const TwoThings: React.FC = () => {
  const one = at('twothings', 'עדכניות');
  const two = at('twothings', 'דיוק');
  return (
    <TalkingHead
      sceneId="twothings"
      zooms={[[0, 1.05], [two - 2, 1.14]]}
      over={
        <>
          <NumPill n={1} x={540} y={1240} appear={one - 3}>
            עדכניות
          </NumPill>
          <NumPill n={2} x={540} y={1420} appear={two - 3}>
            דיוק
          </NumPill>
        </>
      }
    />
  );
};

export const Inject: React.FC = () => {
  const frame = useCurrentFrame();
  const answerAt = at('inject', 'עונה');
  const inj = at('inject', 'מזריק');
  const land = inj + 16;
  const answer = 'ההכנסות של אל על ברבעון השני של 2026 הסתכמו ב-';
  const typedN = Math.round(interpolate(frame, [answerAt, inj - 2], [0, answer.length], clamp));
  const fly = interpolate(frame, [inj, land], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const landed = frame >= land;
  const bubbleIn = ease(frame, 2, 16);
  const from = {x: 540, y: 520};
  const to = {x: 540, y: 1140};
  const cx = from.x + (to.x - from.x) * fly + Math.sin(fly * Math.PI) * 260;
  const cy = from.y + (to.y - from.y) * fly;
  const chipScale = landed ? pop(frame, land, 8) : 1 + Math.sin(fly * Math.PI) * 0.25;
  return (
    <AbsoluteFill>
      <Backdrop />
      <Card3D src="pdf/page-07.png" width={430} aspect={1.414} x={540} y={430} at={0} ry={[-14, 6]} rx={[16, 8]} z={[-120, -40]} dur={len('inject')} glow />
      <Chip x={540} y={150} appear={4} size={40}>
        דיווח מקורי · מאגנא
      </Chip>
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 830,
          height: 400,
          borderRadius: 44,
          background: '#ffffff',
          boxShadow: `0 0 0 3px ${C.mint}, 0 0 120px ${C.glow}44, 0 40px 120px rgba(0,0,0,0.6)`,
          opacity: bubbleIn,
          transform: `translateY(${(1 - bubbleIn) * 80}px)`,
          direction: 'rtl',
          padding: '40px 56px',
          boxSizing: 'border-box',
          fontFamily: FONT.he,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 16, color: C.teal, fontWeight: 800, fontSize: 34, letterSpacing: 1}}>
          <div style={{width: 18, height: 18, borderRadius: 9, background: C.tealBright, boxShadow: `0 0 16px ${C.glow}`}} />
          <span style={{fontFamily: FONT.num}}>XHON</span>
        </div>
        <div style={{marginTop: 18, fontSize: 50, fontWeight: 500, lineHeight: 1.3, color: '#1d2b2b', minHeight: 130}}>
          {answer.slice(0, typedN)}
          {typedN < answer.length && <span style={{display: 'inline-block', width: 4, height: 54, marginRight: 6, background: C.teal, verticalAlign: 'middle'}} />}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 540 - 60 - 170,
            top: 1140 - 830 - 50,
            width: 340,
            height: 100,
            borderRadius: 20,
            border: `3px dashed ${C.tealBright}`,
            opacity: frame >= inj - 8 && !landed ? 0.8 : 0,
          }}
        />
      </div>
      {frame >= inj - 6 && (
        <div
          style={{
            position: 'absolute',
            left: cx - 170,
            top: cy - 50,
            width: 340,
            height: 100,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${C.tealBright}, ${C.teal})`,
            color: C.white,
            fontFamily: FONT.num,
            fontWeight: 700,
            fontSize: 70,
            lineHeight: '100px',
            textAlign: 'center',
            transform: `scale(${chipScale})`,
            boxShadow: `0 0 ${landed ? 70 : 40}px ${C.glow}, 0 20px 50px rgba(0,0,0,0.5)`,
            opacity: ease(frame, inj - 6, inj),
          }}
        >
          $986M
        </div>
      )}
      {landed && (
        <div style={{position: 'absolute', top: 1265, width: '100%', textAlign: 'center', direction: 'rtl', fontFamily: FONT.he, fontSize: 38, fontWeight: 500, color: C.mint, opacity: ease(frame, land + 2, land + 12)}}>
          ✓ המספר מוזרק ישירות מהדוח, לא נוצר על ידי ה-AI
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Trust: React.FC = () => {
  const frame = useCurrentFrame();
  const d = len('trust');
  const src = at('trust', 'נכון');
  const ref = at('trust', 'אסמכתא');
  const scan = interpolate(frame, [6, src + 6], [0, 100], clamp);
  const hl = ease(frame, ref - 3, ref + 6);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Card3D src="img/sources.jpg" width={940} aspect={521 / 753} x={540} y={860} at={0} ry={[-16, 6]} rx={[14, 6]} z={[0, 120]} dur={d}>
        <div style={{position: 'absolute', left: 0, right: 0, top: `${scan}%`, height: 6, background: C.glow, boxShadow: `0 0 40px 10px ${C.glow}`, opacity: scan < 100 ? 0.9 : 0}} />
        <div style={{position: 'absolute', left: 10, right: 10, top: 14, height: 84, borderRadius: 14, border: `5px solid ${C.teal}`, background: `${C.glow}33`, opacity: hl, transform: `scale(${0.9 + 0.1 * hl})`}} />
      </Card3D>
      <Img
        src={staticFile('img/lock.png')}
        style={{
          position: 'absolute',
          left: 70,
          top: 300,
          width: 260,
          transform: `scale(${pop(frame, src - 4, 10)}) rotate(${-12 + Math.sin(frame / 12) * 4}deg)`,
          filter: `drop-shadow(0 30px 40px rgba(0,0,0,0.6)) drop-shadow(0 0 30px ${C.glow}66)`,
        }}
      />
      <Chip x={600} y={1330} appear={ref - 2} size={58}>
        ✓ מספר אסמכתא לכל נתון
      </Chip>
    </AbsoluteFill>
  );
};

export const Speed: React.FC = () => {
  const frame = useCurrentFrame();
  const d = len('speed');
  const a = at('speed', 'תוך');
  const b = at('speed', 'בודדות');
  const ms = interpolate(frame, [a, b + 6], [0, 3.2], clamp);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Card3D src="vid/ipo-wall.mp4" video width={1000} aspect={1080 / 1920} x={540} y={760} at={0} ry={[18, -6]} rx={[12, 4]} z={[0, 160]} dur={d} startFrom={60} playbackRate={1.4} />
      <div
        style={{
          position: 'absolute',
          top: 1120,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT.num,
          fontWeight: 700,
          fontSize: 200,
          color: C.white,
          letterSpacing: -6,
          textShadow: `0 0 60px ${C.glow}88`,
          opacity: ease(frame, a - 6, a),
        }}
      >
        00:0{ms.toFixed(1)}
        <span style={{fontSize: 70, color: C.glow, marginLeft: 12}}>s</span>
      </div>
    </AbsoluteFill>
  );
};

export const NotHours: React.FC = () => {
  const frame = useCurrentFrame();
  const words: [string, string][] = [['שעות', 'שעות'], ['ימים', 'ימים'], ['שבועות', 'שבועות']];
  const times = words.map(([w]) => at('nothours', w));
  const sh = times.map((t) => shake(frame, t, 26, 8)).reduce((a, s) => ({x: a.x + s.x, y: a.y + s.y}), {x: 0, y: 0});
  const d = len('nothours');
  const away = ease(frame, d - 8, d, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill>
      <Backdrop grid={false} tint="#1b3b3b" />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(${1 + away * 0.6})`, opacity: 1 - away}}>
        <div style={{position: 'absolute', top: 330, width: '100%', textAlign: 'center', fontFamily: FONT.he, fontWeight: 300, fontSize: 64, color: C.mint, opacity: ease(frame, 0, 8)}}>
          זה לא
        </div>
        {words.map(([w], i) => (
          <React.Fragment key={w}>
            <BigText top={470 + i * 330} size={250} appear={times[i] - 2} color={i === 2 ? C.white : C.white}>
              {w}
            </BigText>
            <Strike appear={times[i] + 5} width={i === 2 ? 760 : 600} top={600 + i * 330} />
          </React.Fragment>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Skeletons: React.FC = () => {
  const frame = useCurrentFrame();
  const d = len('skeletons');
  const sk = at('skeletons', 'שלדים');
  return (
    <AbsoluteFill>
      <Backdrop />
      <Card3D src="vid/news-feed.mp4" video width={1040} aspect={1080 / 1920} x={540} y={1150} at={0} ry={[-16, 4]} rx={[16, 6]} z={[-80, 80]} dur={d} startFrom={20} />
      <div style={{position: 'absolute', top: 250, width: '100%', textAlign: 'center', fontFamily: FONT.he, fontSize: 52, fontWeight: 500, color: C.mint, opacity: ease(frame, 2, 12)}}>
        סוכני הבינה המלאכותית חושפים
      </div>
      <div style={{filter: glitchFilter(frame, sk)}}>
        <BigText top={340} size={190} appear={sk - 2}>
          שלדים
        </BigText>
        <BigText top={530} size={190} appear={sk + 5} color={C.glow}>
          מהארון
        </BigText>
      </div>
    </AbsoluteFill>
  );
};

const Node: React.FC<{x: number; y: number; title: string; label: string; amount: number; appear: number; countAt: number; tilt: number}> = ({
  x, y, title, label, amount, appear, countAt, tilt,
}) => {
  const frame = useCurrentFrame();
  const s = pop(frame, appear, 12);
  const n = count(frame, countAt - 6, countAt + 12, amount);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 400,
        top: y - 165,
        width: 800,
        height: 330,
        borderRadius: 36,
        background: 'linear-gradient(140deg, rgba(63,165,156,0.35), rgba(6,23,26,0.85))',
        border: `2px solid ${C.mint}`,
        boxShadow: `0 0 80px ${C.glow}44, 0 40px 100px rgba(0,0,0,0.6)`,
        backdropFilter: 'blur(12px)',
        transform: `perspective(1400px) rotateY(${tilt}deg) rotateX(8deg) scale(${s})`,
        opacity: frame < appear ? 0 : 1,
        direction: 'rtl',
        padding: '34px 50px',
        boxSizing: 'border-box',
        color: C.white,
        fontFamily: FONT.he,
      }}
    >
      <div style={{fontSize: 68, fontWeight: 900, lineHeight: 1.1}}>{title}</div>
      <div style={{fontSize: 38, fontWeight: 500, color: C.mint, marginTop: 6}}>{label}</div>
      <div style={{marginTop: 10, fontFamily: FONT.num, fontWeight: 700, fontSize: 96, lineHeight: 1.1, color: C.glow, direction: 'ltr', textAlign: 'right', opacity: frame >= countAt - 6 ? 1 : 0, textShadow: `0 0 30px ${C.glow}88`}}>
        ₪{n}M
      </div>
    </div>
  );
};

export const Deal: React.FC = () => {
  const frame = useCurrentFrame();
  const d = len('deal');
  const sub = at('deal', 'בת');
  const amt = at('deal', '250');
  const parent = at('deal', 'האם');
  const div = at('deal', 'דיבידנד');
  const link = ease(frame, div + 4, div + 20, Easing.inOut(Easing.cubic));
  return (
    <AbsoluteFill>
      <Backdrop />
      <Card3D src="img/news-parent.jpg" width={980} aspect={359 / 1019} x={540} y={300} at={0} ry={[0, 0]} rx={[20, 14]} z={[-500, -380]} dur={d} glow={false} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <path d="M 540 765 C 900 860, 180 950, 540 1045" stroke={C.glow} strokeWidth={6} fill="none" strokeDasharray="18 16" strokeDashoffset={-frame * 3} opacity={link} style={{filter: `drop-shadow(0 0 12px ${C.glow})`}} />
      </svg>
      <Node x={540} y={600} title="חברת בת" label="מגייסת חוב ״לפיתוח ושגשוג״" amount={250} appear={sub - 6} countAt={amt} tilt={-10} />
      <Node x={540} y={1210} title="חברת האם" label="מחלקת דיבידנד לבעלי השליטה" amount={250} appear={parent - 4} countAt={div} tilt={10} />
      <div
        style={{
          position: 'absolute',
          left: 540 - 60,
          top: 905 - 60,
          width: 120,
          height: 120,
          borderRadius: 60,
          background: C.ink,
          border: `4px solid ${C.glow}`,
          color: C.glow,
          fontFamily: FONT.num,
          fontWeight: 700,
          fontSize: 80,
          lineHeight: '112px',
          textAlign: 'center',
          transform: `scale(${pop(frame, div + 14, 10)})`,
          opacity: frame < div + 14 ? 0 : 1,
          boxShadow: `0 0 60px ${C.glow}`,
        }}
      >
        ?
      </div>
    </AbsoluteFill>
  );
};

export const SameSum: React.FC = () => {
  const sum = at('samesum', 'סכום');
  const a = at('samesum', 'במקרה');
  return (
    <TalkingHead
      sceneId="samesum"
      zooms={[[0, 1.04], [sum - 2, 1.18]]}
      shakes={[sum - 2]}
      glitches={[sum - 2]}
      behind={
        <BigText top={70} size={230} appear={a} font={FONT.num} weight={700} color={C.glow} spacing={-8} style={{direction: 'ltr'}}>
          ₪250M
        </BigText>
      }
      over={
        <Chip x={540} y={1130} appear={sum - 2} size={80}>
          <span style={{fontFamily: FONT.num, fontWeight: 700, direction: 'ltr', display: 'inline-block'}}>₪250M = ₪250M</span>
        </Chip>
      }
    />
  );
};

export const Usa: React.FC = () => {
  const frame = useCurrentFrame();
  const d = len('usa');
  const il = at('usa', 'ובארץ');
  const off = ease(frame, il - 4, il + 6);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Card3D src="vid/data-layers.mp4" video playbackRate={0.55} width={1000} aspect={902 / 1450} x={540} y={760 - off * 140} at={0} ry={[14, -4]} rx={[12, 6]} z={[0, 100 - off * 300]} dur={d} />
      <Img
        src={staticFile('img/flag.png')}
        style={{
          position: 'absolute',
          left: 540 - 280,
          top: 1010,
          width: 560,
          transform: `scale(${pop(frame, il - 2, 12)}) rotate(${-4 + Math.sin(frame / 10) * 2}deg)`,
          opacity: frame < il - 2 ? 0 : 1,
          filter: `drop-shadow(0 30px 50px rgba(0,0,0,0.6))`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Info: React.FC = () => {
  const frame = useCurrentFrame();
  const rec = at('info', 'המלצות');
  const info = at('info', 'מידע');
  const dec = at('info', 'ההחלטה');
  const fade = (a: number, b: number) => (frame >= a && frame < b ? 1 : 0);
  const coins = [
    {src: 'img/coin-shekel.png', x: -110, y: 990, w: 300, sp: 0.8, ph: 0},
    {src: 'img/coin-euro.png', x: 850, y: 1600, w: 280, sp: 1.1, ph: 2},
  ];
  return (
    <TalkingHead
      sceneId="info"
      zooms={[[0, 1.0], [info - 1, 1.05], [dec - 2, 1.1]]}
      behind={
        <>
          <div style={{opacity: fade(rec - 3, info - 2) * 0.85}}>
            <BigText top={90} size={220} appear={rec - 3}>
              המלצות
            </BigText>
            <Strike appear={rec + 6} width={760} top={190} />
          </div>
          <div style={{opacity: fade(info - 2, dec - 3)}}>
            <BigText top={40} size={330} appear={info - 2} color={C.glow}>
              מידע
            </BigText>
          </div>
          <div style={{opacity: fade(dec - 3, 1e9)}}>
            <BigText top={60} size={190} appear={dec - 3}>
              ההחלטה <span style={{color: C.glow}}>שלך.</span>
            </BigText>
          </div>
        </>
      }
      over={
        <>
          {coins.map((c) => (
            <Img
              key={c.src}
              src={staticFile(c.src)}
              style={{
                position: 'absolute',
                left: c.x,
                top: c.y + Math.sin(frame / 20 * c.sp + c.ph) * 30,
                width: c.w,
                transform: `rotate(${Math.sin(frame / 30 + c.ph) * 14}deg) scale(${pop(frame, info + (c.ph ? 4 : 0), 14)})`,
                filter: 'blur(1.5px) drop-shadow(0 30px 40px rgba(0,0,0,0.6))',
                opacity: frame < info ? 0 : 0.95,
              }}
            />
          ))}
        </>
      }
    />
  );
};

export const Crazy: React.FC = () => {
  const crazy = at('crazy', 'משוגע');
  return (
    <TalkingHead
      sceneId="crazy"
      grade="warm"
      zooms={[[0, 1.0], [crazy - 2, 1.1]]}
      shakes={[crazy - 2]}
      behind={
        <BigText top={40} size={250} appear={crazy - 3} color={C.glow}>
          משוגע.
        </BigText>
      }
      over={<NameTag name="דני רופ" role="מנחה · הדבר הבא" at={2} />}
    />
  );
};

export const End: React.FC = () => {
  const frame = useCurrentFrame();
  const d = len('end');
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 46%, ${C.glow}40 0%, transparent 50%)`}} />
      <Logo2D dur={d} y={940} />
      <div
        style={{
          position: 'absolute',
          top: 1110,
          left: 80,
          right: 80,
          textAlign: 'center',
          direction: 'rtl',
          fontFamily: FONT.he,
          fontWeight: 500,
          fontSize: 54,
          lineHeight: 1.3,
          color: C.white,
          opacity: ease(frame, 30, 44),
        }}
      >
        הבינה המלאכותית שמנתחת
        <br />
        <b style={{fontWeight: 900, color: C.glow}}>את שוק ההון הישראלי</b>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1400,
          width: '100%',
          textAlign: 'center',
          direction: 'rtl',
          fontFamily: FONT.he,
          fontWeight: 400,
          fontSize: 34,
          color: C.grey,
          opacity: ease(frame, 44, 58),
        }}
      >
        מתוך הראיון ב״הדבר הבא״ · ערוץ 10 כלכלה
      </div>
    </AbsoluteFill>
  );
};

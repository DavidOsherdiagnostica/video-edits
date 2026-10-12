"""Lay the interview clips out into scenes and write data/timeline.json.

Scene starts snap to the music's beat grid so cuts land on the beat.
Captions come from the word-level transcript (data/words.json).
"""
import json
import math
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BPM = 120
BEAT = 60 / BPM
HALF = BEAT / 2

SCENES = [
    {'id': 'hook', 'clips': ['hook'], 'lead': 0.75},
    {'id': 'jaw', 'clips': ['jaw']},
    {'id': 'count', 'clips': ['5000']},
    {'id': 'pdf', 'clips': ['pdf200']},
    {'id': 'army', 'clips': ['army']},
    {'id': 'logo', 'clips': [], 'dur': 2.0},
    {'id': 'hero', 'clips': ['likegpt']},
    {'id': 'chat', 'clips': ['elal'], 'tail': 0.5},
    {'id': 'twothings', 'clips': ['twothings']},
    {'id': 'inject', 'clips': ['inject'], 'tail': 0.3},
    {'id': 'trust', 'clips': ['sure']},
    {'id': 'speed', 'clips': ['seconds']},
    {'id': 'nothours', 'clips': ['nothours']},
    {'id': 'skeletons', 'clips': ['skeletons']},
    {'id': 'deal', 'clips': ['sub250', 'dividend']},
    {'id': 'samesum', 'clips': ['samesum'], 'tail': 0.3},
    {'id': 'usa', 'clips': ['usa']},
    {'id': 'info', 'clips': ['info']},
    {'id': 'crazy', 'clips': ['crazy']},
    {'id': 'end', 'clips': [], 'dur': 3.5},
]

# Whisper spellings fixed to match the human transcript.
FIXES = {'ליווח': 'דיווח', 'אלעל': 'אל על', 'להאמין': 'להבין', 'דיווידנד': 'דיבידנד'}
STRIP = '.,?!'
HIGHLIGHT = {'5000', '200', 'PDF', 'צבא', 'אנליסטים', 'סיכוי', 'הלסת', 'ChatGPT', 'אל על', 'עדכניות', 'דיוק',
             'AI', 'מזריק', 'המספר', 'נכון', 'אסמכתא', 'שניות', 'שעות', 'ימים', 'שבועות', 'שלדים', 'מהארון', '250',
             'מיליון', 'דיבידנד', 'סכום', 'מידע', 'המלצות', 'משוגע', 'הנכונה'}


def load_words():
    raw = json.load(open(os.path.join(ROOT, 'data', 'words.json')))
    out = []
    for w in raw:
        txt = w['w'].strip()
        if out and (txt.startswith('-') or txt.startswith("'")) and w['s'] - out[-1]['e'] < 0.3:
            out[-1]['w'] += txt
            out[-1]['e'] = w['e']
            continue
        out.append({'w': txt, 's': w['s'], 'e': w['e']})
    return out


def clean(word):
    core = word.strip(STRIP)
    core = FIXES.get(core, core)
    core = core.replace('5000', '5,000')
    return core


def is_highlight(word):
    core = word.strip(STRIP).replace(',', '')
    core = re.sub(r'^[ובהלש]-?', '', core) if core not in HIGHLIGHT else core
    return any(h.replace(',', '') == core or h in core for h in HIGHLIGHT)


def chunk(words, max_words=3, max_chars=16):
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        text = ' '.join(x['text'] for x in cur)
        if len(cur) >= max_words or len(text) >= max_chars or w['raw'][-1:] in STRIP:
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return [{'start': c[0]['start'], 'end': c[-1]['end'], 'words': c} for c in chunks]


def main():
    meta = json.load(open(os.path.join(ROOT, 'data', 'clips-meta.json')))
    clips = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'data', 'clips.json')))}
    words = load_words()
    parts = {}
    for m in meta:
        parts.setdefault(m['clip'], []).append(m)

    t = 0.0
    scenes, segments, captions = [], [], []
    for i, sc in enumerate(SCENES):
        if i:
            t = math.ceil((t - 1e-6) / HALF) * HALF
        start = t
        t += sc.get('lead', 0)
        for ci, cid in enumerate(sc['clips']):
            if ci:
                t += 0.12
            for m in parts[cid]:
                a, b = clips[cid]['parts'][m['part']]
                seg_words = []
                for w in words:
                    if w['s'] >= a - 0.08 and w['s'] < b - 0.05 and w['e'] <= b + 0.15:
                        seg_words.append({
                            'raw': w['w'], 'text': clean(w['w']),
                            'start': round(t + max(w['s'] - a, 0), 3), 'end': round(t + min(w['e'], b) - a, 3),
                            'hl': is_highlight(clean(w['w'])),
                        })
                for c in chunk(seg_words):
                    captions.append({**c, 'scene': sc['id'], 'spk': m['spk']})
                segments.append({
                    'scene': sc['id'], 'clip': cid, 'part': m['part'], 'start': round(t, 3), 'dur': m['dur'],
                    'file': f"clips/{cid}_{m['part']}." + ('wav' if m['audioOnly'] else 'mp4'),
                    'fg': None if m['audioOnly'] else f"clips/{cid}_{m['part']}-fg.webm",
                    'audioOnly': m['audioOnly'], 'spk': m['spk'],
                })
                t += m['dur'] + 0.03
        t += sc.get('dur', 0) + sc.get('tail', 0)
        scenes.append({'id': sc['id'], 'start': round(start, 3)})
    for i, sc in enumerate(scenes):
        sc['end'] = scenes[i + 1]['start'] if i + 1 < len(scenes) else round(t, 3)
    for c in captions:
        for w in c['words']:
            del w['raw']
    out = {'fps': 30, 'bpm': BPM, 'duration': round(t, 3), 'scenes': scenes, 'segments': segments,
           'captions': captions}
    json.dump(out, open(os.path.join(ROOT, 'data', 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
    for sc in scenes:
        print(f"{sc['id']:10s} {sc['start']:6.2f} - {sc['end']:6.2f}")
    print('total', round(t, 2))


main()

# XHON — רילס מהראיון ב"הדבר הבא"

רילס אנכי (1080×1920, 30fps, ~73 שניות) שנבנה מהראיון של דוד אושר אצל דני רופ,
עם גרפיקת מושן תלת־ממדית, טקסט מאחורי הדובר, כתוביות מילה־במילה, מוזיקה ואפקטים.

הקובץ המוגמר: `exports/xhon-reel.mp4` בשורש הריפו.

## מבנה

| קובץ | תפקיד |
|---|---|
| `data/clips.json` | רשימת הציטוטים מהראיון (זמני התחלה/סוף בשניות בקובץ המקור) |
| `scripts/prep_clips.py` | חיתוך הקטעים, קרופ 9:16 שממורכז על הפנים, וגזירת הדובר מהרקע (rembg) |
| `scripts/build_timeline.py` | סידור הקטעים לסצנות על גריד הביט (120BPM) ובניית הכתוביות → `data/timeline.json` |
| `scripts/make_music.py` | סינתזה של טראק המוזיקה לפי הסצנות (`public/music.wav`) |
| `scripts/make_sfx.py` | סינתזה של אפקטי הסאונד (`public/sfx/`) |
| `src/scenes/Scenes.tsx` | כל הסצנות |
| `src/components/` | Logo2D (אנימציית הרכבת הלוגו), PaperStorm (סערת דיווחים), Card3D, כתוביות, אפקטים |

## בנייה מחדש

```bash
npm install
scripts/setup_assets.sh                      # מעתיק חומרי גלם ל-public/
python3 -m venv .venv && .venv/bin/pip install faster-whisper "opencv-python-headless<5" "rembg[cpu]" scipy
.venv/bin/python scripts/prep_clips.py       # קטעי ראיון + גזירות
python3 scripts/build_timeline.py
.venv/bin/python scripts/make_music.py
python3 scripts/make_sfx.py
npx remotion studio                          # תצוגה מקדימה
npx remotion render XhonReel out/xhon-reel.mp4 --crf=17 --audio-bitrate=320k
```

`data/words.json` הוא תמלול עם חותמות זמן למילה (faster-whisper עם `ivrit-ai/whisper-large-v3-turbo-ct2`).
כדי לשנות ציטוט: עורכים את `data/clips.json`, מריצים `prep_clips.py <id>` ואז `build_timeline.py` ו-`make_music.py`.

`remotion.config.ts` מצביע על ה-Chromium המותקן בסביבה; במחשב אחר אפשר למחוק את שורת `setBrowserExecutable`.

להחלפת קובץ המקור באיכות גבוהה יותר (אותה עריכה, אותם זמנים):

```bash
XHON_SRC="/path/to/better.mp4" .venv/bin/python scripts/prep_clips.py
```

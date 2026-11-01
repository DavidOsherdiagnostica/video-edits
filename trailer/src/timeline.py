"""Shared timeline for the earnings-season trailer (all times in seconds)."""

FPS = 24
W, H = 1920, 1080
BAR = 138  # letterbox bar height (2.39:1 inside 16:9)

FLASH = 2 / 3  # each storm sub-shot lasts 16 frames

# (name, start, end) on the master timeline
SEGMENTS = [
    ("card_open", 0.0, 3.0),
    ("street", 3.0, 6.5),
    ("flash1", 6.5, 6.5 + FLASH),
    ("stocks", 6.5 + FLASH, 10.5 + FLASH),
    ("flash2", 10.5 + FLASH, 10.5 + 2 * FLASH),
    ("flash3", 10.5 + 2 * FLASH, 12.5),
    ("night", 12.5, 21.75),
    ("chat", 21.75, 29.75),
    ("cards_end", 29.75, 34.25),
    ("logo", 34.25, 37.25),
]
START = {name: s for name, s, _ in SEGMENTS}
END = {name: e for name, _, e in SEGMENTS}
TOTAL = SEGMENTS[-1][2]

# Source ranges inside the clips
STREET_SRC = 3.0          # picture; its audio starts from the clip's first frame at t=0
STOCKS_SRC = 2.5

# The night sequence: the push-in from behind runs continuously (its clock keeps going under the cutaways),
# interrupted by short typing inserts. (clip, source start, source end)
NIGHT_CUTS = [
    ("office", 0.0, 2.0),
    ("typing", 0.8, 1.5),   # hands on the keyboard, wide (already mid-typing)
    ("office", 2.7, 4.2),
    ("typing", 3.2, 3.8),   # extreme close-up on the keys
    ("office", 4.8, 6.3),
    ("typing", 5.2, 5.8),   # the watch, side angle
    ("office", 6.9, 9.25),  # uninterrupted run through the head into the monitor
]
NIGHT_WHITE = 9.0         # the frame is fully white, relative to START["night"]
TYPING_BED = (0.0, 7.0)   # typing-clip audio used as a continuous bed (stops before the coffee)

# Chat page timeline (mirrors window.TIMELINE in chat.html), relative to START["chat"]
CHAT_TYPE = (0.9, 2.9)
CHAT_PRESS = 3.1          # first dramatic beat
CHAT_TABLE = 4.5          # second beat: the answer lands

# End cards, relative to START["cards_end"]
END_CARD1 = (0.25, 1.75)
END_CARD2 = 2.1
FLUTTER = 2.4
FLUTTER_DURATION = 2.0

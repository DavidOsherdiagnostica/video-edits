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
    ("typing", 12.5, 18.5),
    ("office", 18.5, 23.75),
    ("chat", 23.75, 31.75),
    ("cards_end", 31.75, 36.25),
    ("logo", 36.25, 39.25),
]
START = {name: s for name, s, _ in SEGMENTS}
END = {name: e for name, _, e in SEGMENTS}
TOTAL = SEGMENTS[-1][2]

# Source ranges inside the clips
STREET_SRC = 3.0          # picture; its audio starts from the clip's first frame at t=0
STOCKS_SRC = 2.5
TYPING_CUTS = [(0.0, 1.5), (3.0, 4.4), (5.0, 6.4), (7.4, 9.1)]
OFFICE_SRC = 2.5          # push-in from behind, through the monitor into white
OFFICE_SPEED = 1.3
OFFICE_WHITE = (9.0 - OFFICE_SRC) / OFFICE_SPEED  # when the frame is fully white, relative to START["office"]

# Chat page timeline (mirrors window.TIMELINE in chat.html), relative to START["chat"]
CHAT_TYPE = (0.55, 2.75)
CHAT_QUERY_LEN = 60
CHAT_PRESS = 3.05
CHAT_THINK = (3.4, 4.75)
CHAT_ANSWER = 4.75
CHAT_ROWS = [4.75 + 0.35 + i * 0.24 for i in range(5)]
CHAT_SOURCES = 6.35

# End cards, relative to START["cards_end"]
END_CARD1 = (0.25, 1.75)
END_CARD2 = 2.1
FLUTTER = 2.4
FLUTTER_DURATION = 2.0

#!/usr/bin/env bash
# Copy the raw materials the reel uses into public/ under ASCII names and
# rasterize the Magna filings PDF. Generated clips/music/sfx come from the
# Python scripts (see README).
set -euo pipefail
cd "$(dirname "$0")/.."
R="../../raw materials"
mkdir -p public/img public/vid public/pdf
pdftoppm -r 110 -png "$R/דיווחי מאגנא.pdf" public/pdf/page
cp "$R/hon_full_logo_5X1.svg" public/img/logo-light.svg
cp "$R/hon_full_logo_5X1_for_dark_mode.svg" public/img/logo-dark.svg
cp "$R/mcp-logo-icon-1X1.png" public/img/mcp.png
cp "$R/metal-lock.png" public/img/lock.png
cp "$R/realistic-israel-flag.png" public/img/flag.png
cp "$R/המקורות עם מספר אסמכתא.jpeg" public/img/sources.jpg
cp "$R/ידיעה שחושפת את החברת אם וחברת בת.jpeg" public/img/news-parent.jpg
cp "$R/מטבע יוקרתי שמוטבע עליו סמל של יורו תלת מימדי בזוית.png" public/img/coin-euro.png
cp "$R/מטבע יוקרתי שמוטבע עליו סמל של שח תלת מימדי בזוית.png" public/img/coin-shekel.png
cp "$R/מסך צ'אט AI.jpeg" public/img/chat-screen.jpg
cp "$R/נתונים פיננסיים.jpeg" public/img/financials.jpg
cp "$R/צילום מסך הירו סקשן דף הבית.jpeg" public/img/hero.jpg
cp "$R/פיד החדשות שנכתב על ידי סוכני AI בזמן אמת.mp4" public/vid/news-feed.mp4
cp "$R/קיר ההנפקות של ישראל.mp4" public/vid/ipo-wall.mp4
cp "$R/שכבות מידע.mp4" public/vid/data-layers.mp4

#!/usr/bin/env bash
# Re-subset LXGW WenKai font from the full TTF using all characters found in
# content files and Vue components.
#
# Usage: ./scripts/subset-font.sh
#
# Prerequisites:
#   pip3 install fonttools brotli
#   Place the full LXGWWenKai-Regular.ttf in app/assets/ (gitignored).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_DIR/app/assets"
TTF="$ASSETS_DIR/LXGWWenKai-Regular.ttf"
# 输出到 public/fonts：URL 稳定（无构建 hash），nuxt.config 里的 preload 才能生效
WOFF2="$PROJECT_DIR/public/fonts/LXGWWenKai-Regular.woff2"

if [ ! -f "$TTF" ]; then
    echo "ERROR: Full font not found at $TTF"
    echo "Place the complete LXGWWenKai-Regular.ttf there and re-run."
    exit 1
fi

echo "==> Extracting characters from content and UI ..."

python3 -c "
import os
import re
import sys

PROJECT_DIR = '$PROJECT_DIR'

# CJK unicode ranges
CJK_PATTERN = re.compile(
    '[一-鿿㐀-䶿豈-﫿'
    '　-〿＀-￯\U0002f800-\U0002fa1f]'
)

def extract_from_dir(path, exts):
    chars = set()
    if not os.path.isdir(path):
        return chars
    for root, dirs, files in os.walk(path):
        # Skip hidden dirs and assets
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'assets']
        for f in files:
            if f.startswith('.'):
                continue
            if any(f.endswith(ext) for ext in exts):
                filepath = os.path.join(root, f)
                try:
                    with open(filepath, 'r', encoding='utf-8') as fh:
                        chars.update(CJK_PATTERN.findall(fh.read()))
                except (UnicodeDecodeError, OSError):
                    pass
    return chars

chars = set()

# Content markdown files
chars.update(extract_from_dir(os.path.join(PROJECT_DIR, 'content'), ['.md']))

# Vue/TS source files
chars.update(extract_from_dir(os.path.join(PROJECT_DIR, 'app'), ['.vue', '.ts', '.js']))

# Root config files
for f in ['nuxt.config.ts', 'tailwind.config.js']:
    fp = os.path.join(PROJECT_DIR, f)
    if os.path.isfile(fp):
        try:
            with open(fp, 'r', encoding='utf-8') as fh:
                chars.update(CJK_PATTERN.findall(fh.read()))
        except OSError:
            pass

print(f'    Found {len(chars)} unique CJK characters')

# Add ASCII printable
chars.update(chr(i) for i in range(32, 127))

# Common symbols
chars.update('—–…“”‘’《》•°×÷'
             '±≈≠≤≥∞√∑∫∏'
             'π①②③④⑤⑥⑦⑧⑨'
             '←↑→↓↔↕↖↗↘↙'
             '⇒⇔●○◌★☆♩♪♫'
             '♬✓✗')

chars = ''.join(sorted(chars))
print(f'    Total with ASCII + symbols: {len(chars)} characters')

# Write charset file
charset_file = '$TTF.charset.txt'
with open(charset_file, 'w') as f:
    f.write(chars)
print(f'    Charset saved to {charset_file}')
sys.exit(0)
"

CHARSET_FILE="$TTF.charset.txt"

echo "==> Running pyftsubset ..."
pyftsubset "$TTF" \
    --text-file="$CHARSET_FILE" \
    --output-file="$WOFF2" \
    --flavor=woff2 \
    --layout-features='*' \
    --no-hinting \
    --desubroutinize

SIZE=$(ls -lh "$WOFF2" | awk '{print $5}')
echo "==> Done: $WOFF2 ($SIZE)"

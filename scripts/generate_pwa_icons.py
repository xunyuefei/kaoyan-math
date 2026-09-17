# -*- coding: utf-8 -*-
"""
生成考研数学与考研英语 PWA 全套像素级高品位图标
尺寸要求：
- 192x192 (icon-192.png)
- 512x512 (icon-512.png)
- 512x512 maskable (icon-maskable.png, 80% 安全区)
- 180x180 (apple-touch-icon.png)
- 64x64 (favicon.png)
"""

import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

MATH_ICONS_DIR = Path(r"c:\Users\31085\Desktop\数学练习产出Note\icons")
ENGLISH_ICONS_DIR = Path(r"c:\Users\31085\Desktop\红宝书讲义_排版修复版\_内部核心程序与数据(无需修改)\web_portal\icons")

MATH_ICONS_DIR.mkdir(parents=True, exist_ok=True)
ENGLISH_ICONS_DIR.mkdir(parents=True, exist_ok=True)

def draw_gradient_background(draw, size, color_top, color_bottom, radius=0):
    w, h = size
    for y in range(h):
        ratio = y / h
        r = int(color_top[0] * (1 - ratio) + color_bottom[0] * ratio)
        g = int(color_top[1] * (1 - ratio) + color_bottom[1] * ratio)
        b = int(color_top[2] * (1 - ratio) + color_bottom[2] * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

def create_math_icon(size, is_maskable=False):
    # Base image
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors: Deep Sapphire to Electric Blue
    c_top = (15, 23, 42)      # #0f172a
    c_bottom = (30, 58, 138)  # #1e3a8a
    c_gold = (250, 204, 21)   # #facc15
    c_cyan = (56, 189, 248)   # #38bdf8

    if is_maskable:
        # Maskable fills entire canvas
        draw_gradient_background(draw, (size, size), c_top, c_bottom)
        scale_box = 0.72  # keep content within 72% safe zone
    else:
        # Rounded corner squircle
        corner_r = int(size * 0.22)
        # Draw gradient on a temp square then mask
        temp = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        temp_draw = ImageDraw.Draw(temp)
        draw_gradient_background(temp_draw, (size, size), c_top, c_bottom)

        mask = Image.new("L", (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=corner_r, fill=255)
        img.paste(temp, (0, 0), mask)
        scale_box = 0.85

    # Center coordinates
    cx, cy = size // 2, size // 2
    r_box = int(size * scale_box // 2)

    # Draw geometric decorative ring (Golden Ratio & Coordinate System)
    ring_r = int(r_box * 0.88)
    draw.ellipse([(cx - ring_r, cy - ring_r), (cx + ring_r, cy + ring_r)],
                 outline=(56, 189, 248, 80), width=max(2, size // 96))

    # Inner subtle glow ring
    inner_r = int(r_box * 0.72)
    draw.ellipse([(cx - inner_r, cy - inner_r), (cx + inner_r, cy + inner_r)],
                 outline=(250, 204, 21, 100), width=max(1, size // 160))

    # Draw mathematical symbols: Integral ∫ and Sigma Σ
    try:
        # Try finding system font
        font_path = "C:/Windows/Fonts/cambria.ttc"
        if not os.path.exists(font_path): font_path = "C:/Windows/Fonts/georgia.ttf"
        if not os.path.exists(font_path): font_path = "C:/Windows/Fonts/arial.ttf"

        font_sym = ImageFont.truetype(font_path, int(size * 0.42))
        font_sub = ImageFont.truetype(font_path, int(size * 0.13))
        font_bold = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(size * 0.16))
    except Exception:
        font_sym = ImageFont.load_default()
        font_sub = font_sym
        font_bold = font_sym

    # Main symbol: ∫
    sym_text = "∫"
    bbox = draw.textbbox((0, 0), sym_text, font=font_sym)
    w_sym = bbox[2] - bbox[0]
    h_sym = bbox[3] - bbox[1]
    draw.text((cx - w_sym // 2 - int(size * 0.08), cy - h_sym // 2 - int(size * 0.05)),
              sym_text, font=font_sym, fill=(255, 255, 255, 245))

    # Secondary symbol: λ
    lambda_text = "λ"
    bbox_l = draw.textbbox((0, 0), lambda_text, font=font_bold)
    draw.text((cx + int(size * 0.08), cy - int(size * 0.16)),
              lambda_text, font=font_bold, fill=(250, 204, 21, 230))

    # Monogram badge: "SOP"
    badge_text = "SOP"
    bbox_b = draw.textbbox((0, 0), badge_text, font=font_sub)
    w_b = bbox_b[2] - bbox_b[0]
    badge_y = cy + int(size * 0.15)
    
    # Pill background for "SOP"
    pill_pad = int(size * 0.04)
    draw.rounded_rectangle([
        (cx - w_b // 2 - pill_pad, badge_y - int(size * 0.02)),
        (cx + w_b // 2 + pill_pad, badge_y + int(size * 0.13))
    ], radius=int(size * 0.04), fill=(37, 99, 235, 200), outline=(56, 189, 248, 220), width=max(1, size // 180))
    
    draw.text((cx - w_b // 2, badge_y), badge_text, font=font_sub, fill=(255, 255, 255, 255))

    return img

def create_english_icon(size, is_maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors: Luxury Deep Burgundy to Ruby Crimson
    c_top = (76, 5, 25)        # #4c0519
    c_bottom = (159, 18, 57)   # #9f1239
    c_gold = (251, 191, 36)    # #fbbf24

    if is_maskable:
        draw_gradient_background(draw, (size, size), c_top, c_bottom)
        scale_box = 0.72
    else:
        corner_r = int(size * 0.22)
        temp = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        temp_draw = ImageDraw.Draw(temp)
        draw_gradient_background(temp_draw, (size, size), c_top, c_bottom)

        mask = Image.new("L", (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=corner_r, fill=255)
        img.paste(temp, (0, 0), mask)
        scale_box = 0.85

    cx, cy = size // 2, size // 2
    r_box = int(size * scale_box // 2)

    # Elegant gold circular crest
    crest_r = int(r_box * 0.86)
    draw.ellipse([(cx - crest_r, cy - crest_r), (cx + crest_r, cy + crest_r)],
                 outline=(251, 191, 36, 120), width=max(2, size // 96))

    try:
        font_path = "C:/Windows/Fonts/georgia.ttf"
        if not os.path.exists(font_path): font_path = "C:/Windows/Fonts/times.ttf"
        font_big = ImageFont.truetype(font_path, int(size * 0.38))
        font_sub = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(size * 0.13))
    except Exception:
        font_big = ImageFont.load_default()
        font_sub = font_big

    # Main Letter: "R" (for Red Book / 红宝书)
    main_letter = "R"
    bbox_m = draw.textbbox((0, 0), main_letter, font=font_big)
    w_m = bbox_m[2] - bbox_m[0]
    h_m = bbox_m[3] - bbox_m[1]
    draw.text((cx - w_m // 2, cy - h_m // 2 - int(size * 0.07)),
              main_letter, font=font_big, fill=(255, 255, 255, 250))

    # Golden accent bar
    bar_w = int(size * 0.35)
    bar_y = cy + int(size * 0.14)
    draw.line([(cx - bar_w // 2, bar_y), (cx + bar_w // 2, bar_y)],
              fill=(251, 191, 36, 220), width=max(2, size // 100))

    # Badge text: "VOCAB"
    badge_text = "VOCAB"
    bbox_v = draw.textbbox((0, 0), badge_text, font=font_sub)
    w_v = bbox_v[2] - bbox_v[0]
    draw.text((cx - w_v // 2, bar_y + int(size * 0.03)),
              badge_text, font=font_sub, fill=(251, 191, 36, 240))

    return img

def main():
    print("==========================================================")
    print("🎨 正在生成考研数学与考研英语全套像素级 PWA 图标套件...")
    print("==========================================================")

    # 1. 考研数学图标
    print("[1/2] 正在生成数学知识库图标 (Deep Sapphire & Gold)...")
    create_math_icon(192).save(MATH_ICONS_DIR / "icon-192.png", "PNG")
    create_math_icon(512).save(MATH_ICONS_DIR / "icon-512.png", "PNG")
    create_math_icon(512, is_maskable=True).save(MATH_ICONS_DIR / "icon-maskable.png", "PNG")
    create_math_icon(180).save(MATH_ICONS_DIR / "apple-touch-icon.png", "PNG")
    create_math_icon(64).save(MATH_ICONS_DIR / "favicon.png", "PNG")
    print("  [✓] 数学图标已生成: icon-192, icon-512, icon-maskable, apple-touch-icon, favicon")

    # 2. 考研英语图标
    print("\n[2/2] 正在生成英语知识库图标 (Burgundy & Gold)...")
    create_english_icon(192).save(ENGLISH_ICONS_DIR / "icon-192.png", "PNG")
    create_english_icon(512).save(ENGLISH_ICONS_DIR / "icon-512.png", "PNG")
    create_english_icon(512, is_maskable=True).save(ENGLISH_ICONS_DIR / "icon-maskable.png", "PNG")
    create_english_icon(180).save(ENGLISH_ICONS_DIR / "apple-touch-icon.png", "PNG")
    create_english_icon(64).save(ENGLISH_ICONS_DIR / "favicon.png", "PNG")
    print("  [✓] 英语图标已生成: icon-192, icon-512, icon-maskable, apple-touch-icon, favicon")

    print("\n[✓] 全套像素级 PWA 图标生成完毕！")

if __name__ == "__main__":
    main()

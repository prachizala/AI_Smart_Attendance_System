import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

os.makedirs("mobile/assets", exist_ok=True)

def create_gradient(width, height, start_color, end_color):
    """Creates a vertical linear gradient image."""
    base = Image.new("RGBA", (width, height), start_color)
    top = Image.new("RGBA", (width, height), end_color)
    mask = Image.new("L", (width, height))
    mask_data = []
    for y in range(height):
        mask_data.extend([int(255 * (y / height))] * width)
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

def draw_glowing_circle(draw, center, radius, color, width=6, glow_width=18):
    cx, cy = center
    # Outer glow
    r_g, g_g, b_g = color[:3]
    for i in range(glow_width, 0, -2):
        alpha = int(40 * (1 - i / glow_width))
        draw.ellipse([cx - radius - i, cy - radius - i, cx + radius + i, cy + radius + i],
                     outline=(r_g, g_g, b_g, alpha), width=width + i)
    # Core circle
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                 outline=color, width=width)

def draw_corner_brackets(draw, box, length, color, width=8):
    x0, y0, x1, y1 = box
    # Top-Left
    draw.line([(x0, y0), (x0 + length, y0)], fill=color, width=width)
    draw.line([(x0, y0), (x0, y0 + length)], fill=color, width=width)
    # Top-Right
    draw.line([(x1, y0), (x1 - length, y0)], fill=color, width=width)
    draw.line([(x1, y0), (x1, y0 + length)], fill=color, width=width)
    # Bottom-Left
    draw.line([(x0, y1), (x0 + length, y1)], fill=color, width=width)
    draw.line([(x0, y1), (x0, y1 - length)], fill=color, width=width)
    # Bottom-Right
    draw.line([(x1, y1), (x1 - length, y1)], fill=color, width=width)
    draw.line([(x1, y1), (x1, y1 - length)], fill=color, width=width)

def draw_face_scanner(draw, center, scale=1.0):
    cx, cy = center
    cyan = (56, 189, 248, 255)      # #38BDF8
    emerald = (16, 185, 129, 255)   # #10B981
    white = (255, 255, 255, 255)
    
    # Outer reticle brackets (Size ~ 360 * scale)
    box_sz = int(180 * scale)
    b_len = int(50 * scale)
    b_w = max(4, int(10 * scale))
    draw_corner_brackets(draw, (cx - box_sz, cy - box_sz, cx + box_sz, cy + box_sz), b_len, cyan, width=b_w)
    
    # Concentric target circle
    circ_r = int(140 * scale)
    draw_glowing_circle(draw, (cx, cy), circ_r, (56, 189, 248, 200), width=max(3, int(6 * scale)), glow_width=int(16 * scale))
    
    # Stylized Head / Face Oval
    head_w = int(60 * scale)
    head_h = int(75 * scale)
    draw.ellipse([cx - head_w, cy - head_h - int(15 * scale), cx + head_w, cy + head_h - int(15 * scale)],
                 outline=white, width=max(3, int(7 * scale)))
    
    # Face Eyes
    eye_r = int(7 * scale)
    eye_offset_x = int(24 * scale)
    eye_y = cy - int(25 * scale)
    draw.ellipse([cx - eye_offset_x - eye_r, eye_y - eye_r, cx - eye_offset_x + eye_r, eye_y + eye_r], fill=cyan)
    draw.ellipse([cx + eye_offset_x - eye_r, eye_y - eye_r, cx + eye_offset_x + eye_r, eye_y + eye_r], fill=cyan)
    
    # Nose & Smile/Mouth Arc
    draw.arc([cx - int(18 * scale), cy - int(10 * scale), cx + int(18 * scale), cy + int(20 * scale)],
             start=30, end=150, fill=white, width=max(2, int(5 * scale)))
    
    # Shoulders / Torso Arc
    torso_w = int(110 * scale)
    torso_h = int(80 * scale)
    draw.arc([cx - torso_w, cy + int(40 * scale), cx + torso_w, cy + int(40 * scale) + torso_h * 2],
             start=200, end=340, fill=white, width=max(3, int(7 * scale)))

    # Laser scan line across face
    scan_y = cy - int(10 * scale)
    scan_w = int(130 * scale)
    draw.line([(cx - scan_w, scan_y), (cx + scan_w, scan_y)], fill=(16, 185, 129, 230), width=max(3, int(6 * scale)))
    
    # Small verified check badge at bottom right
    badge_cx = cx + int(90 * scale)
    badge_cy = cy + int(85 * scale)
    badge_r = int(32 * scale)
    draw.ellipse([badge_cx - badge_r, badge_cy - badge_r, badge_cx + badge_r, badge_cy + badge_r],
                 fill=(16, 185, 129, 255), outline=white, width=max(2, int(4 * scale)))
    
    # Checkmark inside badge
    chk_w = max(2, int(5 * scale))
    p1 = (badge_cx - int(12 * scale), badge_cy)
    p2 = (badge_cx - int(3 * scale), badge_cy + int(9 * scale))
    p3 = (badge_cx + int(13 * scale), badge_cy - int(9 * scale))
    draw.line([p1, p2], fill=white, width=chk_w)
    draw.line([p2, p3], fill=white, width=chk_w)

def generate_all():
    print("Generating App Icons & Splash Graphics...")
    
    # 1. ICON (1024x1024)
    img_icon = create_gradient(1024, 1024, (15, 23, 42, 255), (79, 70, 229, 255))
    draw_icon = ImageDraw.Draw(img_icon)
    
    # Subtle background tech grid lines
    grid_color = (255, 255, 255, 15)
    for i in range(0, 1024, 64):
        draw_icon.line([(i, 0), (i, 1024)], fill=grid_color, width=1)
        draw_icon.line([(0, i), (1024, i)], fill=grid_color, width=1)
        
    draw_face_scanner(draw_icon, (512, 512), scale=1.85)
    img_icon.save("mobile/assets/icon.png", "PNG")
    print("Saved mobile/assets/icon.png (1024x1024)")
    
    # 2. ADAPTIVE ICON FOREGROUND (1024x1024 Transparent Background)
    # Safe zone for Android Adaptive Icon is centered circle of diameter ~720 (specifically 432x432 safe inner zone)
    img_adapt = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw_adapt = ImageDraw.Draw(img_adapt)
    draw_face_scanner(draw_adapt, (512, 512), scale=1.45)
    img_adapt.save("mobile/assets/adaptive-icon.png", "PNG")
    print("Saved mobile/assets/adaptive-icon.png (1024x1024)")
    
    # 3. SPLASH SCREEN / POSTER (1242 x 2436)
    img_splash = create_gradient(1242, 2436, (10, 15, 30, 255), (49, 46, 129, 255))
    draw_splash = ImageDraw.Draw(img_splash)
    
    # Background subtle radial tech rings
    for r in range(200, 1200, 150):
        draw_splash.ellipse([621 - r, 1000 - r, 621 + r, 1000 + r], outline=(56, 189, 248, 12), width=2)
        
    # Large glowing scanner icon
    draw_face_scanner(draw_splash, (621, 950), scale=2.1)
    
    # Text Titles (drawn manually with fallback shapes/lines if font not found)
    try:
        font_title = ImageFont.truetype("arial.ttf", 64)
        font_sub = ImageFont.truetype("arial.ttf", 36)
        font_tag = ImageFont.truetype("arial.ttf", 26)
        
        draw_splash.text((621, 1420), "SMART ATTENDANCE", font=font_title, fill=(255, 255, 255, 255), anchor="mm")
        draw_splash.text((621, 1500), "AI Facial & Biometric System", font=font_sub, fill=(56, 189, 248, 255), anchor="mm")
        draw_splash.text((621, 1560), "100m Geofence • Anti-Spoof Liveness", font=font_tag, fill=(148, 163, 184, 255), anchor="mm")
    except Exception:
        pass
        
    img_splash.save("mobile/assets/splash.png", "PNG")
    print("Saved mobile/assets/splash.png (1242x2436)")
    
    # 4. DASHBOARD POSTER BANNER (1080 x 480)
    img_poster = create_gradient(1080, 480, (15, 23, 42, 255), (67, 56, 202, 255))
    draw_poster = ImageDraw.Draw(img_poster)
    
    # Decorative rings on right
    for r in range(60, 360, 50):
        draw_poster.ellipse([820 - r, 240 - r, 820 + r, 240 + r], outline=(56, 189, 248, 20), width=2)
    draw_face_scanner(draw_poster, (820, 240), scale=0.9)
    
    try:
        f_b_title = ImageFont.truetype("arial.ttf", 44)
        f_b_sub = ImageFont.truetype("arial.ttf", 24)
        f_b_pill = ImageFont.truetype("arial.ttf", 18)
        
        # Pill badge
        draw_poster.rounded_rectangle([70, 70, 320, 110], radius=20, fill=(16, 185, 129, 40), outline=(16, 185, 129, 200), width=2)
        draw_poster.text((195, 90), "● AI SYSTEM ONLINE", font=f_b_pill, fill=(16, 185, 129, 255), anchor="mm")
        
        draw_poster.text((70, 160), "Smart Attendance", font=f_b_title, fill=(255, 255, 255, 255))
        draw_poster.text((70, 225), "Facial Recognition & GPS Geofence", font=f_b_sub, fill=(56, 189, 248, 255))
        draw_poster.text((70, 270), "Dual-factor verification with zero-touch punch", font=f_b_sub, fill=(203, 213, 225, 255))
    except Exception:
        pass
        
    img_poster.save("mobile/assets/poster.png", "PNG")
    print("Saved mobile/assets/poster.png (1080x480)")

if __name__ == "__main__":
    generate_all()

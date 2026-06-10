# Minimal 256x256 ICO with DS-themed purple gradient
import struct, zlib, os

def make_ico(out_path):
    def chunk(w, h, pixels):
        # BMP info header
        header = struct.pack('<IIIHHIIIIII', 40, w, h*2, 1, 32, 0, len(pixels), 0, 0, 0, 0)
        return header + pixels

    def argb(r, g, b, a=255):
        return struct.pack('<BBBB', b, g, r, a)

    w = h = 256
    pixels = b''
    for y in range(h-1, -1, -1):
        for x in range(w):
            # DeepSeek purple gradient with DS logo suggestion
            cx, cy = x - w//2, y - h//2
            dist = (cx*cx + cy*cy) ** 0.5
            
            if dist < 60:
                # Inner circle - bright purple
                r, g, b = 138, 80, 220
            elif dist < 80:
                # Ring
                r, g, b = 80, 40, 160
            elif dist < 100:
                # Outer glow
                t = (dist - 80) / 20
                r = int(80*(1-t) + 50*t)
                g = int(40*(1-t) + 30*t)
                b = int(160*(1-t) + 100*t)
            elif abs(cx) < 10 and abs(cy) < 80:
                # Vertical bar of S
                r, g, b = 138, 80, 220
            elif cy > -30 and cy < 30 and cx > -80 and cx < 0:
                # Top curve
                if cy < 0 or abs(cx) < 60:
                    r, g, b = 138, 80, 220
                else:
                    r, g, b = 80, 40, 160
            else:
                r, g, b = 30, 15, 60
            
            # Fade edges
            if dist > 95:
                alpha = max(0, int(255 * (1 - (dist - 95) / 15)))
            else:
                alpha = 255
            pixels += argb(r, g, b, alpha)

    img_data = chunk(w, h, pixels)
    ico_data = struct.pack('<HHH', 0, 1, 1)  # Reserved, Type=1 (ICO), Count=1
    entry = struct.pack('<BBBBHHII', w if w < 256 else 0, h if h < 256 else 0, 0, 0, 1, 32, len(img_data), 22)
    with open(out_path, 'wb') as f:
        f.write(ico_data + entry + img_data)
    print(f"Created: {out_path} ({os.path.getsize(out_path)} bytes)")

make_ico(os.path.join(os.path.dirname(__file__), 'build', 'icon.ico'))

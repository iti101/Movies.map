from PIL import Image, ImageDraw
import numpy as np
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[1] / 'src' / 'assets'


def stripe_params_from_wordmark():
    arr = np.array(Image.open(ASSETS / 'moviesLOGO.png').convert('L'))
    ink = arr < 128
    x = 5
    rows = ink[:, x]
    runs, in_run, s = [], False, 0
    for i, v in enumerate(rows):
        if v and not in_run:
            s, in_run = i, True
        elif not v and in_run:
            runs.append((s, i - 1))
            in_run = False
    if in_run:
        runs.append((s, len(rows) - 1))
    bar = int(np.median([b - a + 1 for a, b in runs]))
    gap = int(np.median([runs[i][0] - runs[i - 1][1] - 1 for i in range(1, len(runs))]))
    return bar, gap


def make_striped_icon():
    bar, gap = stripe_params_from_wordmark()
    period = bar + gap
    print(f'wordmark bar={bar} gap={gap} period={period}')

    src = Image.open(ASSETS / 'logo_ICON_original.jfif').convert('RGB')
    w, h = src.size
    arr = np.array(src)
    ink = arr.min(axis=-1) < 90

    ys = np.where(ink.any(axis=1))[0]
    content_h = int(ys[-1] - ys[0] + 1)
    # Match absolute bar rhythm density of the wordmark letters
    target_cycles = 14
    scale = content_h / (target_cycles * period)
    bar_s = max(2, int(round(bar * scale)))
    gap_s = max(2, int(round(gap * scale)))
    period_s = bar_s + gap_s
    y0 = int(ys[0])
    print(f'scaled bar={bar_s} gap={gap_s} period={period_s}')

    flood = src.copy()
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(flood, seed, (255, 0, 0), thresh=40)
    flood_arr = np.array(flood)
    exterior = (flood_arr[:, :, 0] > 200) & (flood_arr[:, :, 1] < 40) & (flood_arr[:, :, 2] < 40)
    enclosed = (~ink) & (~exterior)

    small = Image.fromarray((enclosed.astype(np.uint8) * 255)).resize((w // 8, h // 8), Image.NEAREST)
    small_m = np.array(small) > 128
    labels = np.zeros(small_m.shape, dtype=np.int32)
    lab = 0
    sizes = {}
    hh, ww = small_m.shape
    for y in range(hh):
        for x in range(ww):
            if not small_m[y, x] or labels[y, x]:
                continue
            lab += 1
            stack = [(y, x)]
            labels[y, x] = lab
            size = 0
            while stack:
                cy, cx = stack.pop()
                size += 1
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < hh and 0 <= nx < ww and small_m[ny, nx] and labels[ny, nx] == 0:
                        labels[ny, nx] = lab
                        stack.append((ny, nx))
            sizes[lab] = size

    print('components:', sorted(sizes.values(), reverse=True)[:12])
    threshold = max(sizes.values()) * 0.08
    keep_labs = {l for l, s in sizes.items() if s >= threshold}
    keep_small = np.isin(labels, list(keep_labs))
    keep_full = np.array(
        Image.fromarray(keep_small.astype(np.uint8) * 255).resize((w, h), Image.NEAREST)
    ) > 128
    fill_region = enclosed & keep_full

    yy = np.arange(h)[:, None]
    stripe2 = np.broadcast_to(((yy - y0) % period_s) < bar_s, (h, w))

    final = np.full((h, w, 3), 255, dtype=np.uint8)
    # Striped panel fills (wordmark language)
    final[fill_region & stripe2] = 0
    # Keep original outlines solid for readable silhouette
    final[ink] = 0

    out_img = Image.fromarray(final)
    out_img.save(ASSETS / 'logo_ICON.png')
    out_img.save(ASSETS / 'logo_ICON.jfif', quality=95, subsampling=0)
    print('saved', out_img.size)


def tighten_map_gap_further():
    """Optional optical tighten: bring MAP slightly closer than median letter gap."""
    img = Image.open(ASSETS / 'moviesLOGO.png').convert('RGB')
    arr = np.array(img)
    ink = arr.min(axis=-1) < 128
    cols = ink.any(axis=0)
    runs, in_run, s = [], False, 0
    for i, v in enumerate(cols):
        if v and not in_run:
            s, in_run = i, True
        elif not v and in_run:
            runs.append((start := s, i - 1))
            in_run = False
    if in_run:
        runs.append((s, len(cols) - 1))
    # rebuild properly
    runs = []
    in_run = False
    for i, v in enumerate(cols):
        if v and not in_run:
            s, in_run = i, True
        elif not v and in_run:
            runs.append((s, i - 1))
            in_run = False
    if in_run:
        runs.append((s, len(cols) - 1))
    gaps = [runs[i][0] - runs[i - 1][1] - 1 for i in range(1, len(runs))]
    print('current gaps', gaps)
    # Dot is the narrow run (~62px); MAP starts after it
    dot_i = min(range(len(runs)), key=lambda i: runs[i][1] - runs[i][0])
    if dot_i + 1 >= len(runs):
        return
    gap_after_dot = gaps[dot_i]
    # Letter gaps excluding spaces around I and before-dot
    letter_gaps = [g for g in gaps if g < 50]
    target = int(np.median(letter_gaps))
    # Optical: period is short, so use ~85% of letter gap
    target = max(18, int(round(target * 0.85)))
    shift = gap_after_dot - target
    print(f'dot_i={dot_i} gap_after={gap_after_dot} target={target} shift={shift}')
    if shift <= 0:
        return
    cut = runs[dot_i + 1][0]
    left_end = runs[dot_i][1] + 1 + target
    map_block = arr[:, cut:]
    out = np.full((arr.shape[0], left_end + map_block.shape[1], 3), 255, dtype=np.uint8)
    out[:, :left_end] = arr[:, :left_end]
    out[:, left_end:] = map_block
    # trim
    ink2 = out.min(axis=-1) < 128
    ys = np.where(ink2.any(1))[0]
    xs = np.where(ink2.any(0))[0]
    pad = 20
    trimmed = out[max(0, ys[0] - pad) : ys[-1] + pad + 1, max(0, xs[0] - pad) : xs[-1] + pad + 1]
    Image.fromarray(trimmed).save(ASSETS / 'moviesLOGO.png')
    print('moviesLOGO tightened', trimmed.shape[1], 'x', trimmed.shape[0])


if __name__ == '__main__':
    tighten_map_gap_further()
    make_striped_icon()

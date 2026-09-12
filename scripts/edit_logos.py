from PIL import Image
import numpy as np
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[1] / 'src' / 'assets'


def column_runs(ink_cols):
    runs = []
    in_run = False
    start = 0
    for i, v in enumerate(ink_cols):
        if v and not in_run:
            start = i
            in_run = True
        elif not v and in_run:
            runs.append((start, i - 1))
            in_run = False
    if in_run:
        runs.append((start, len(ink_cols) - 1))
    return runs


def analyze_wordmark():
    img = Image.open(ASSETS / 'moviesLOGO.png').convert('RGBA')
    arr = np.array(img)
    # ink where alpha>0 and not near-white
    rgb = arr[..., :3].astype(np.int16)
    ink = (arr[..., 3] > 200) & (rgb.min(axis=-1) < 128)
    cols = ink.any(axis=0)
    runs = column_runs(cols)
    gaps = [runs[i][0] - runs[i - 1][1] - 1 for i in range(1, len(runs))]
    print('size', img.size)
    print('runs', len(runs))
    for i, (a, b) in enumerate(runs):
        gap = '' if i == 0 else f' gap_before={gaps[i - 1]}'
        print(f'  {i}: {a}-{b} w={b - a + 1}{gap}')
    print('gaps', gaps)
    return img, arr, ink, runs, gaps


def fix_wordmark_spacing():
    img, arr, ink, runs, gaps = analyze_wordmark()
    # Widest gap should be between "." and "MAP"
    widest_i = max(range(1, len(runs)), key=lambda i: gaps[i - 1])
    wide_gap = gaps[widest_i - 1]
    # Typical letter gap: median of smaller gaps (exclude the widest)
    other = [g for i, g in enumerate(gaps) if i != widest_i - 1]
    other_sorted = sorted(other)
    target_gap = other_sorted[len(other_sorted) // 2]
    shift = wide_gap - target_gap
    print(f'widest gap before run {widest_i}: {wide_gap}, target={target_gap}, shift left by {shift}')

    if shift <= 0:
        print('No shift needed')
        return

    # Everything from start of MAP (run widest_i) moves left by `shift`
    cut = runs[widest_i][0]
    h, w = arr.shape[:2]
    out = np.full_like(arr, 255)
    # keep left part (up through end of gap, leaving target_gap)
    left_end = runs[widest_i - 1][1] + 1 + target_gap
    out[:, :left_end] = arr[:, :left_end]
    # paste MAP block
    map_block = arr[:, cut:]
    new_w = left_end + map_block.shape[1]
    # crop trailing whitespace from map_block right if needed; canvas stays same or shrink
    # Place into same-sized canvas first then trim
    canvas_w = max(w - shift, new_w)
    out2 = np.full((h, canvas_w, 4), 255, dtype=np.uint8)
    out2[:, :left_end] = arr[:, :left_end]
    end = left_end + map_block.shape[1]
    if end > canvas_w:
        out2 = np.full((h, end, 4), 255, dtype=np.uint8)
        out2[:, :left_end] = arr[:, :left_end]
    out2[:, left_end : left_end + map_block.shape[1]] = map_block

    # Trim excess white on right/left/top/bottom with small padding
    ink2 = (out2[..., 3] > 200) & (out2[..., :3].min(axis=-1) < 128)
    ys = np.where(ink2.any(axis=1))[0]
    xs = np.where(ink2.any(axis=0))[0]
    pad = 20
    y0, y1 = max(0, ys[0] - pad), min(out2.shape[0], ys[-1] + pad + 1)
    x0, x1 = max(0, xs[0] - pad), min(out2.shape[1], xs[-1] + pad + 1)
    trimmed = out2[y0:y1, x0:x1]

    # Ensure opaque white background (original is white bg)
    result = Image.fromarray(trimmed, 'RGBA').convert('RGB')
    out_path = ASSETS / 'moviesLOGO.png'
    result.save(out_path)
    print('saved', out_path, result.size)

    # verify
    verify = np.array(Image.open(out_path).convert('L'))
    ink_v = verify < 128
    runs_v = column_runs(ink_v.any(axis=0))
    gaps_v = [runs_v[i][0] - runs_v[i - 1][1] - 1 for i in range(1, len(runs_v))]
    print('new gaps', gaps_v)


if __name__ == '__main__':
    fix_wordmark_spacing()

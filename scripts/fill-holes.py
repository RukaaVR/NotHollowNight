"""Second keying pass: clears enclosed patches of the white Canva background that the
outer flood fill cannot reach (gaps between roots, arms, weapons). Small white details
(eyes, highlights) stay because only large, flat, near-pure-white regions are removed."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

MIN_FRAC = float(sys.argv[1])
for path in sys.argv[2:]:
    im = np.array(Image.open(path).convert("RGBA")).astype(np.int16)
    rgb, a = im[..., :3], im[..., 3]
    white = (rgb.min(axis=2) > 238) & (rgb.max(axis=2) - rgb.min(axis=2) < 10) & (a > 0)
    lab, n = ndimage.label(white)
    if n == 0:
        continue
    sizes = ndimage.sum(white, lab, range(1, n + 1))
    big = np.isin(lab, np.nonzero(sizes > MIN_FRAC * a.size)[0] + 1)
    if not big.any():
        continue
    big = ndimage.binary_dilation(big, iterations=1)
    out = im.copy()
    out[..., 3] = np.where(big, 0, a)
    Image.fromarray(out.astype(np.uint8)).save(path)
    print(path, int(big.sum()))

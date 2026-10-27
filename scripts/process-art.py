"""Convert raw AI art in art-source/ into web-ready files in public/assets/.

art-source/{bg,char,item,video}/<name>.<jfif|jpg|png|mp4>  ->  public/assets/<same folder>/<name>.webp|.mp4
- bg:    resize to 1920 wide, webp
- char:  remove white background, keep only the biggest pose of a character sheet, webp with alpha
- item:  remove white background, trim, 384 px, webp with alpha
- video: 1280x720 H.264, no audio, faststart (needs ffmpeg)
Run: python scripts/process-art.py
"""
import pathlib, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'art-source', ROOT / 'public' / 'assets'


def cut_white(im: Image.Image) -> Image.Image:
    """Make the near-white background transparent: only white regions touching the border, so white eyes/paper survive."""
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    white = (a.min(axis=2) > 225) & (a.max(axis=2) - a.min(axis=2) < 25)
    lab, _ = ndimage.label(white)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    bg = ndimage.binary_dilation(bg, iterations=2)  # eat the light halo left by jpeg
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = np.asarray(Image.fromarray(alpha).filter(__import__('PIL.ImageFilter', fromlist=['x']).GaussianBlur(1)))
    out = im.convert('RGBA'); out.putalpha(Image.fromarray(alpha)); return out


def main_pose(im: Image.Image) -> Image.Image:
    """Character sheets hold several poses: keep only the biggest figure."""
    solid = np.asarray(im.getchannel('A')) > 40
    lab, n = ndimage.label(ndimage.binary_dilation(solid, iterations=3))
    if n == 0: return im
    keep = lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)
    a = np.asarray(im).copy(); a[~keep, 3] = 0
    return Image.fromarray(a)


def save(im: Image.Image, dest: pathlib.Path, box: int):
    if im.mode == 'RGBA': im = im.crop(im.getbbox())
    im.thumbnail((box, box), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest.with_suffix('.webp'), 'WEBP', quality=82, method=6)


import sys
only = sys.argv[1] if len(sys.argv) > 1 else '*'  # e.g. python scripts/process-art.py char
for f in sorted(SRC.glob(f'{only}/*')):
    kind, dest = f.parent.name, OUT / f.parent.name / f.name
    if kind == 'video':
        dest.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(f), '-an', '-vf', 'scale=1280:-2', '-c:v', 'libx264',
                        '-crf', '28', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(dest.with_suffix('.mp4'))], check=True)
    elif kind == 'bg':
        save(Image.open(f).convert('RGB'), dest, 1920)
    elif kind == 'char':
        save(main_pose(cut_white(Image.open(f))), dest, 900)
    elif kind == 'item':
        save(cut_white(Image.open(f)), dest, 384)
    else:
        continue
    print('ok', f.relative_to(SRC))

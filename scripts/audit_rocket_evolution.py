#!/usr/bin/env python3
"""Audit Rocket evolution WebP cards in small reproducible batches.

Usage:
  python3 -m pip install Pillow
  python3 scripts/audit_rocket_evolution.py --start 0 --count 10
  python3 scripts/audit_rocket_evolution.py --start 10 --count 10 --reference path/to/lv3.webp

Reports measurements only; does not overwrite any card images.
"""
import argparse
import json
from pathlib import Path
from statistics import median

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "public/assets/rocket/cards/evolution"


def rgb_median(image, box):
    crop = image.crop(box).convert("RGB")
    pixels = list(crop.getdata())
    return tuple(round(median(p[i] for p in pixels)) for i in range(3))


def regions(image):
    """Normalized sampling locations; inspect visually before using as color targets."""
    w, h = image.size
    def box(x0, y0, x1, y1):
        return (int(w*x0), int(h*y0), max(int(w*x0)+1,int(w*x1)),
                max(int(h*y0)+1,int(h*y1)))
    return {
        "top_edge": box(.06, .015, .94, .035),
        "left_edge": box(.015, .10, .035, .90),
        "right_edge": box(.965, .10, .985, .90),
        "bottom_edge": box(.06, .965, .94, .985),
        "upper_white_candidate": box(.18, .085, .32, .105),
        "name_black_candidate": box(.18, .035, .32, .055),
    }


def audit(path, reference=None):
    with Image.open(path) as src:
        image = src.convert("RGB")
    samples = {name: rgb_median(image, rect) for name, rect in regions(image).items()}
    result = {"file": path.name, "width": image.width, "height": image.height,
              "samples": samples}
    if reference:
        with Image.open(reference) as src:
            ref = src.convert("RGB")
        ref_samples = {name: rgb_median(ref, rect) for name, rect in regions(ref).items()}
        result["reference"] = reference.name
        result["rgb_distance_to_reference"] = {
            name: round(sum((a-b)**2 for a,b in zip(value, ref_samples[name]))**.5, 1)
            for name,value in samples.items()
        }
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--reference", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.start < 0 or args.count < 1:
        parser.error("--start must be >= 0 and --count must be >= 1")
    files = sorted(CARDS.glob("*.webp"))
    if not files:
        parser.error(f"No WebP files found in {CARDS}")
    if args.reference and not args.reference.is_file():
        parser.error(f"Reference not found: {args.reference}")
    batch = files[args.start:args.start+args.count]
    rows = [audit(path, args.reference) for path in batch]
    payload = {"total_files": len(files), "start": args.start, "count": len(batch),
               "results": rows, "note": "Sample regions are provisional, not validated card-mask locations."}
    output = args.output or Path(f"rocket-evolution-audit-{args.start:02d}.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"Audited {len(batch)} / {len(files)} files; saved {output}")
    for row in rows:
        print(row["file"], row["width"], "x", row["height"], row["samples"])


if __name__ == "__main__":
    main()

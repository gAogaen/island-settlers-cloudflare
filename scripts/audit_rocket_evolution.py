#!/usr/bin/env python3
"""Read-only audit of Rocket evolution WebP images. Requires Pillow."""
from pathlib import Path
from collections import Counter
import json, statistics, sys
from PIL import Image, ImageStat

ROOT = Path("public/assets/rocket/cards/evolution")
OUT = Path("docs/rocket-evolution-pixel-audit.json")
results = []
for path in sorted(ROOT.glob("*.webp")):
    record = {"file": path.name}
    try:
        with Image.open(path) as source:
            source.load()
            record["format"] = source.format
            record["dimensions"] = list(source.size)
            rgb = source.convert("RGB")
        w, h = rgb.size
        record["aspect_ratio"] = round(w / h, 6)
        # Interior patches are observations, NOT assumed white/black/type masks.
        patches = {
            "top_center": (0.40, 0.04, 0.60, 0.09),
            "name_center": (0.30, 0.12, 0.70, 0.17),
            "face_center": (0.40, 0.40, 0.60, 0.60),
            "left_edge": (0.025, 0.25, 0.055, 0.75),
            "right_edge": (0.945, 0.25, 0.975, 0.75),
        }
        for label, (x0, y0, x1, y1) in patches.items():
            crop = rgb.crop((int(w*x0), int(h*y0), int(w*x1), int(h*y1)))
            record[label + "_median_rgb"] = [
                int(statistics.median(channel.getdata())) for channel in crop.split()
            ]
        # Dark-pixel run near each side; only a geometric screening indicator.
        def dark_x(y, side):
            xs = range(int(w*.01), int(w*.20)) if side == "left" else range(int(w*.80), int(w*.99))
            candidates = [x for x in xs if max(rgb.getpixel((x,y))) < 65]
            return min(candidates) if side == "left" and candidates else max(candidates) if candidates else None
        for side in ("left", "right"):
            positions = [dark_x(int(h*f), side) for f in (.25,.35,.45,.55,.65,.75)]
            valid = [p for p in positions if p is not None]
            record[side + "_dark_edge_positions"] = positions
            record[side + "_dark_edge_spread_px"] = max(valid)-min(valid) if len(valid)>=2 else None
        record["decoded"] = True
    except Exception as exc:
        record["decoded"] = False
        record["error"] = str(exc)
    results.append(record)
summary = {
    "count": len(results),
    "decoded": sum(r["decoded"] for r in results),
    "dimensions": dict(Counter("x".join(map(str,r["dimensions"])) for r in results if r["decoded"])),
    "records": results,
    "limitations": [
        "Median RGB patches are not segmented white/name/type regions.",
        "Dark-edge spread is a screening metric, not a validated perspective correction.",
        "Shadow detection and reference Lv.3 color matching require image-specific masks and visual review."
    ]
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(summary, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(f"Audited {summary['decoded']}/{summary['count']} images; wrote {OUT}")
sys.exit(0 if summary["count"] == 74 and summary["decoded"] == 74 else 1)

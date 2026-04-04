from __future__ import annotations

import shutil
from pathlib import Path
from urllib.request import urlretrieve

import cv2
import numpy as np

BASE_DIR = Path(__file__).resolve().parent
SAMPLES_DIR = BASE_DIR / "samples"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

VIDEO_SOURCES = {
    "connaught_place.mp4": "https://cdn.pixabay.com/vimeo/328940142/traffic-24126.mp4?width=1280&hash=8f7d8b6c83ef4ba3a8c3a3bcb7f76ba2a2c87fa0",
    "chandni_chowk.mp4": "https://cdn.pixabay.com/vimeo/239740212/street-13016.mp4?width=1280&hash=4f591475dbbc27d6fa35db87f6ed93fd0f340250",
    "india_gate.mp4": "https://cdn.pixabay.com/vimeo/502324353/traffic-64813.mp4?width=1280&hash=2f40d95f5810e0fdf0f48f2a63a4a26752a8f525",
    "ito_junction.mp4": "https://cdn.pixabay.com/vimeo/419353671/city-33906.mp4?width=1280&hash=86fca60f7fba95f2165e3b9c6f865e0ea587df2f",
}


def _build_synthetic(path: Path, width: int = 640, height: int = 360, fps: int = 24, seconds: int = 12):
    writer = cv2.VideoWriter(
        str(path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )

    frames = fps * seconds
    for i in range(frames):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:] = (20, 22, 24)

        cv2.line(frame, (0, int(height * 0.72)), (width, int(height * 0.72)), (70, 70, 70), 2)
        cv2.line(frame, (0, int(height * 0.84)), (width, int(height * 0.84)), (50, 50, 50), 2)

        x = int((i * 5) % (width + 100) - 100)
        cv2.rectangle(frame, (x, int(height * 0.74)), (x + 100, int(height * 0.81)), (0, 200, 220), -1)

        for j in range(6):
            px = int((i * 3 + j * 90) % width)
            py = int(height * 0.62 + ((j % 3) * 8))
            cv2.circle(frame, (px, py), 3, (200, 220, 40), -1)

        cv2.putText(frame, "NETRA SAMPLE", (14, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (220, 220, 220), 2)
        writer.write(frame)

    writer.release()


def main():
    print("Preparing detector sample videos...")
    for name, url in VIDEO_SOURCES.items():
        target = SAMPLES_DIR / name
        if target.exists() and target.stat().st_size > 0:
            print(f"[skip] {name} already exists")
            continue

        print(f"[download] {name}")
        try:
            urlretrieve(url, target)
            if target.stat().st_size == 0:
                raise RuntimeError("downloaded empty file")
            print(f"[ok] {name}")
        except Exception as exc:
            print(f"[fallback] {name} ({exc})")
            _build_synthetic(target)
            print(f"[ok] synthetic {name}")

    drone_pov = SAMPLES_DIR / "drone_pov.mp4"
    if not drone_pov.exists() or drone_pov.stat().st_size == 0:
        for candidate in sorted(SAMPLES_DIR.glob("*.mp4")):
            if candidate.name == "drone_pov.mp4":
                continue
            shutil.copy(candidate, drone_pov)
            print(f"[ok] drone_pov.mp4 (copied from {candidate.name})")
            break

    print("Done. Files in detector/samples:")
    for video in sorted(SAMPLES_DIR.glob("*.mp4")):
        print(f" - {video.name}")


if __name__ == "__main__":
    main()

import math
from pathlib import Path

import cv2
import numpy as np

OUT_DIR = Path("detector/samples")
OUT_DIR.mkdir(parents=True, exist_ok=True)

VIDEOS = [
    ("fc_road.mp4", "FC Road"),
    ("jm_road.mp4", "JM Road"),
    ("koregaon_park.mp4", "Koregaon Park"),
    ("swargate.mp4", "Swargate"),
]

FPS = 24
SECONDS = 12
WIDTH = 1280
HEIGHT = 720
FRAMES = FPS * SECONDS


def try_writer(path: Path):
    # Prefer H.264-compatible tags, then fallback.
    for fourcc_name in ("avc1", "H264", "mp4v"):
        fourcc = cv2.VideoWriter_fourcc(*fourcc_name)
        writer = cv2.VideoWriter(str(path), fourcc, FPS, (WIDTH, HEIGHT))
        if writer.isOpened():
            return writer, fourcc_name
    raise RuntimeError(f"Unable to open VideoWriter for {path}")


def draw_scene(frame_idx: int, place_name: str, seed: int):
    rng = np.random.default_rng(seed)
    frame = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)

    # Bright daytime sky and city backdrop
    frame[:380, :] = (235, 215, 180)
    frame[380:450, :] = (210, 205, 200)
    frame[450:, :] = (165, 165, 165)

    # Buildings
    for i in range(8):
        bx = 40 + i * 150
        bw = 110 + (i % 3) * 15
        bh = 150 + (i % 4) * 50
        color = (150 + (i * 8) % 70, 150 + (i * 5) % 60, 145 + (i * 7) % 60)
        cv2.rectangle(frame, (bx, 450 - bh), (bx + bw, 450), color, -1)

    # Road lane markings
    for lane_y in (520, 590, 660):
        for x in range(0, WIDTH, 80):
            cv2.rectangle(frame, (x + (frame_idx * 10) % 80, lane_y), (x + 40 + (frame_idx * 10) % 80, lane_y + 6), (245, 245, 245), -1)

    # Cars (bright colored)
    for i in range(14):
        base_speed = 3 + (i % 5)
        x = int((frame_idx * base_speed * (1 if i % 2 == 0 else -1) + i * 120 + (i * 27)) % (WIDTH + 200)) - 100
        y = 490 + (i % 3) * 65
        car_color = (
            int(60 + (i * 37) % 190),
            int(80 + (i * 53) % 170),
            int(70 + (i * 29) % 180),
        )
        cv2.rectangle(frame, (x, y), (x + 70, y + 28), car_color, -1)
        cv2.circle(frame, (x + 14, y + 28), 8, (35, 35, 35), -1)
        cv2.circle(frame, (x + 56, y + 28), 8, (35, 35, 35), -1)

    # Crowd blobs on sidewalk
    for i in range(22):
        px = int((i * 57 + frame_idx * (1 + i % 3)) % WIDTH)
        py = 430 + (i % 5) * 4
        col = (80 + (i * 7) % 120, 90 + (i * 9) % 110, 95 + (i * 11) % 100)
        cv2.circle(frame, (px, py), 5, col, -1)

    # Sun
    cv2.circle(frame, (WIDTH - 130, 100), 55, (245, 245, 210), -1)

    # Text overlay
    cv2.putText(frame, place_name, (30, 55), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (45, 45, 45), 3, cv2.LINE_AA)
    cv2.putText(frame, "Daylight Traffic Sample", (30, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (55, 55, 55), 2, cv2.LINE_AA)

    # Mild noise to avoid flat synthetic look
    noise = rng.normal(0, 6, frame.shape).astype(np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return frame


def main():
    codec_report = []
    for idx, (filename, place) in enumerate(VIDEOS):
        path = OUT_DIR / filename
        writer, codec = try_writer(path)
        for f in range(FRAMES):
            frame = draw_scene(f, place, seed=idx * 997 + f)
            writer.write(frame)
        writer.release()
        codec_report.append((filename, codec, path.stat().st_size))

    # Remove old Delhi-named files to avoid accidental usage.
    for old_name in ("connaught_place.mp4", "chandni_chowk.mp4", "india_gate.mp4", "ito_junction.mp4"):
        old_path = OUT_DIR / old_name
        if old_path.exists():
            old_path.unlink()

    print("Generated files:")
    for name, codec, size in codec_report:
        print(f"- {name} codec={codec} size={size}")


if __name__ == "__main__":
    main()

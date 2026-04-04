#!/usr/bin/env python3
"""
NETRA — Check which footage files exist and print their duration.

Usage:
    python check_footage.py
"""

import os
import sys

FOOTAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "footage")

EXPECTED_FILES = {
    "CAM-01": "cam-01-pune.mp4",
    "CAM-02": "cam-02-highway.mp4",
    "CAM-03": "cam-03-animal.mp4",
    "CAM-04": "cam-04-signal.mp4",
}


def main():
    print("NETRA — Footage Check")
    print("=" * 50)
    print(f"Directory: {FOOTAGE_DIR}")
    print()

    try:
        import cv2
    except ImportError:
        print("WARNING: opencv-python not installed, cannot check durations")
        print("Install: pip install opencv-python")
        cv2 = None

    found = 0
    total_duration = 0.0

    for cam_id, filename in EXPECTED_FILES.items():
        filepath = os.path.join(FOOTAGE_DIR, filename)

        if not os.path.exists(filepath):
            print(f"  {cam_id}: ✗ MISSING  — {filename}")
            continue

        size_kb = os.path.getsize(filepath) // 1024
        duration_str = "??"

        if cv2 is not None:
            cap = cv2.VideoCapture(filepath)
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS) or 30
                frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                duration = frame_count / fps
                total_duration += duration
                mins = int(duration // 60)
                secs = int(duration % 60)
                duration_str = f"{mins}m {secs}s"
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                duration_str += f" ({w}x{h} @ {fps:.0f}fps)"
            cap.release()

        print(f"  {cam_id}: ✓ OK       — {filename} [{size_kb}KB] {duration_str}")
        found += 1

    print()
    print(f"Result: {found}/{len(EXPECTED_FILES)} footage files present")

    if total_duration > 0:
        mins = int(total_duration // 60)
        secs = int(total_duration % 60)
        print(f"Total duration: {mins}m {secs}s")

    if found == 0:
        print()
        print("Run 'python setup_footage.py' to download footage.")
        sys.exit(1)
    elif found < len(EXPECTED_FILES):
        print()
        print("Some footage missing. Run 'python setup_footage.py' to retry.")

    print()


if __name__ == "__main__":
    main()

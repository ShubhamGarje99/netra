import subprocess
import os
import sys
import shutil
import time

FOOTAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "footage")

CAMERAS = [
    {
        "id": "CAM-01",
        "output": os.path.join(FOOTAGE_DIR, "cam-01-pune.mp4"),
        "yt_search": "Sakri Dengarours Road Accident Live CCTV Footage",
        "trim_start": "00:00:30",
        "trim_duration": "00:04:00",
    },
    {
        "id": "CAM-02",
        "output": os.path.join(FOOTAGE_DIR, "cam-02-highway.mp4"),
        "yt_search": "Mysterious Road - Mindless people on the road. !!! Incidents !!! CCTV Captured.",
        "trim_start": "00:00:00",
        "trim_duration": "00:04:00",
    },
    {
        "id": "CAM-03",
        "output": os.path.join(FOOTAGE_DIR, "cam-03-animal.mp4"),
        "yt_search": "Car accident Caught CCTV India _2",
        "trim_start": "00:00:00",
        "trim_duration": "00:04:00",
    },
    {
        "id": "CAM-04",
        "output": os.path.join(FOOTAGE_DIR, "cam-04-signal.mp4"),
        "yt_search": "Live accident on road car crash",
        "trim_start": "00:00:00",
        "trim_duration": "00:04:00",
    },
]


def check_tool(name: str) -> bool:
    """Check if a CLI tool is available on PATH."""
    return shutil.which(name) is not None


def download_and_trim(camera: dict) -> bool:
    """Download a single camera's footage using yt-dlp, then trim with ffmpeg."""
    cam_id = camera["id"]
    output = camera["output"]
    raw_output = output.replace(".mp4", "-raw.mp4")

    # Skip if already downloaded
    if os.path.exists(output) and os.path.getsize(output) > 10_000:
        print(f"  ✓ {cam_id}: Already exists ({os.path.getsize(output) // 1024}KB), skipping")
        return True

    # Step 1: Download with yt-dlp
    print(f"  ↓ {cam_id}: Downloading — search: \"{camera['yt_search']}\"")
    yt_cmd = [
        "yt-dlp",
        f"ytsearch1:{camera['yt_search']}",
        "-f", "best[ext=mp4][height<=720]/best[height<=720]",
        "-o", raw_output,
        "--no-playlist",
        "--merge-output-format", "mp4",
        "--no-warnings",
        "--quiet",
    ]

    print(f"    Command: {' '.join(yt_cmd)}")
    try:
        result = subprocess.run(yt_cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"  ✗ {cam_id}: yt-dlp failed (exit {result.returncode})")
            if result.stderr:
                print(f"    stderr: {result.stderr[:300]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"  ✗ {cam_id}: yt-dlp timed out after 120s")
        return False
    except Exception as e:
        print(f"  ✗ {cam_id}: yt-dlp error: {e}")
        return False

    if not os.path.exists(raw_output):
        print(f"  ✗ {cam_id}: Raw file not found after download")
        return False

    # Step 2: Trim with ffmpeg
    print(f"  ✂ {cam_id}: Trimming {camera['trim_start']} + {camera['trim_duration']}")
    ffmpeg_cmd = [
        "ffmpeg",
        "-ss", camera["trim_start"],
        "-t", camera["trim_duration"],
        "-i", raw_output,
        "-c", "copy",
        output,
        "-y",
        "-loglevel", "error",
    ]

    try:
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            print(f"  ✗ {cam_id}: ffmpeg trim failed (exit {result.returncode})")
            if result.stderr:
                print(f"    stderr: {result.stderr[:300]}")
            # Fall back to using raw file directly
            print(f"  ↻ {cam_id}: Using raw file as fallback")
            os.rename(raw_output, output)
            return True
    except Exception as e:
        print(f"  ✗ {cam_id}: ffmpeg error: {e}")
        # Fall back to raw file
        if os.path.exists(raw_output):
            os.rename(raw_output, output)
            return True
        return False

    # Step 3: Cleanup raw file
    if os.path.exists(raw_output):
        os.remove(raw_output)
        print(f"  🗑 {cam_id}: Cleaned up raw file")

    if os.path.exists(output) and os.path.getsize(output) > 10_000:
        print(f"  ✓ {cam_id}: Done ({os.path.getsize(output) // 1024}KB)")
        return True
    else:
        print(f"  ✗ {cam_id}: Output file missing or too small")
        return False


def main():
    print("=" * 60)
    print("NETRA — Footage Download Script")
    print("=" * 60)
    print()

    # Check prerequisites
    missing = []
    if not check_tool("yt-dlp"):
        missing.append("yt-dlp")
    if not check_tool("ffmpeg"):
        missing.append("ffmpeg")

    if missing:
        print("ERROR: Missing required tools:")
        for tool in missing:
            print(f"  • {tool}")
        print()
        print("Install instructions:")
        print("  macOS:   brew install yt-dlp ffmpeg")
        print("  Ubuntu:  pip install yt-dlp && sudo apt install ffmpeg")
        print("  Windows: pip install yt-dlp && choco install ffmpeg")
        sys.exit(1)

    print(f"Tools OK: yt-dlp ✓, ffmpeg ✓")
    print()

    # Create footage directory
    os.makedirs(FOOTAGE_DIR, exist_ok=True)
    print(f"Footage directory: {FOOTAGE_DIR}")
    print()

    # Download each camera
    results = {}
    start_time = time.time()

    for cam in CAMERAS:
        print(f"[{cam['id']}] Processing...")
        success = download_and_trim(cam)
        results[cam["id"]] = success
        print()

    elapsed = time.time() - start_time

    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    succeeded = sum(1 for v in results.values() if v)
    failed = sum(1 for v in results.values() if not v)

    for cam_id, ok in results.items():
        status = "✓ OK" if ok else "✗ FAILED"
        print(f"  {cam_id}: {status}")

    print()
    print(f"Result: {succeeded}/{len(results)} cameras downloaded")
    print(f"Time:   {elapsed:.1f}s")

    if failed > 0:
        print()
        print("NOTE: Failed downloads can be retried by running this script again.")
        print("The inference service handles missing files gracefully — cameras")
        print("without footage will be reported as offline in /health.")

    # Total duration of successful files
    try:
        import cv2
        total_seconds = 0
        for cam in CAMERAS:
            if os.path.exists(cam["output"]):
                cap = cv2.VideoCapture(cam["output"])
                if cap.isOpened():
                    fps = cap.get(cv2.CAP_PROP_FPS) or 30
                    frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                    total_seconds += frames / fps
                cap.release()
        if total_seconds > 0:
            mins = int(total_seconds // 60)
            secs = int(total_seconds % 60)
            print(f"Total footage: {mins}m {secs}s")
    except Exception:
        pass

    print()


if __name__ == "__main__":
    main()

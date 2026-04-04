"""
YOLOv8 Car Crash Detection — Training Script with W&B
======================================================
Dataset  : car_crash_dataset  (1808 images, 7 classes)
Model    : YOLOv8n fine-tuned from pretrained weights
Device   : MPS (Apple Silicon GPU)
Tracking : Weights & Biases — precision, recall, PR curve, confusion matrix
Output   : runs/train/car_crash_v1/
"""

import os
from pathlib import Path

import wandb
from ultralytics import YOLO
from ultralytics.utils.callbacks.wb import callbacks as wb_callbacks

# ── Paths ────────────────────────────────────────────────────────────────────
DETECTOR_DIR = Path(__file__).parent.resolve()
DATA_YAML    = DETECTOR_DIR / "car_crash_dataset" / "data.yaml"
PRETRAINED   = DETECTOR_DIR / "yolov8n.pt"

assert DATA_YAML.exists(),  f"data.yaml not found at {DATA_YAML}"
assert PRETRAINED.exists(), f"Pretrained weights not found at {PRETRAINED}"

# ── W&B Config ───────────────────────────────────────────────────────────────
WANDB_PROJECT = "netra-car-crash"
WANDB_RUN     = "yolov8n-10ep"

# ── Hyperparameters ──────────────────────────────────────────────────────────
EPOCHS    = 10
IMG_SIZE  = 640
BATCH     = 16
WORKERS   = 4
PROJECT   = str(DETECTOR_DIR / "runs" / "train")
RUN_NAME  = "car_crash_v1"
DEVICE    = "mps"


def main():
    # ── Init W&B ─────────────────────────────────────────────────────────────
    run = wandb.init(
        project = WANDB_PROJECT,
        name    = WANDB_RUN,
        config  = {
            "model":     "yolov8n",
            "epochs":    EPOCHS,
            "imgsz":     IMG_SIZE,
            "batch":     BATCH,
            "device":    DEVICE,
            "dataset":   "car_crash_dataset",
            "nc":        7,
            "classes":   ["vehicle", "person", "accident", "car-crash", "crash", "moderate", "severe"],
            "optimizer": "AdamW (auto)",
        },
        tags=["yolov8", "car-crash", "netra", "mps"],
    )

    print("=" * 60)
    print(" NETRA — YOLOv8 Training  |  W&B: " + run.url)
    print("=" * 60)
    print(f"  Data    : {DATA_YAML}")
    print(f"  Weights : {PRETRAINED}")
    print(f"  Device  : {DEVICE}  |  Epochs: {EPOCHS}  |  Batch: {BATCH}")
    print(f"  Output  : {PROJECT}/{RUN_NAME}")
    print("=" * 60)

    # ── Load model & register W&B callbacks ──────────────────────────────────
    model = YOLO(str(PRETRAINED))
    for event, cb in wb_callbacks.items():
        model.add_callback(event, cb)

    # ── Train ─────────────────────────────────────────────────────────────────
    results = model.train(
        data      = str(DATA_YAML),
        epochs    = EPOCHS,
        imgsz     = IMG_SIZE,
        batch     = BATCH,
        workers   = WORKERS,
        device    = DEVICE,
        project   = PROJECT,
        name      = RUN_NAME,
        exist_ok  = True,
        patience  = 0,      # disable early stopping for short run
        save      = True,
        plots     = True,   # saves PR curve, confusion matrix, F1 curve, etc.
        val       = True,
        # Augmentation
        hsv_h     = 0.015,
        hsv_s     = 0.7,
        hsv_v     = 0.4,
        degrees   = 5.0,
        translate = 0.1,
        scale     = 0.5,
        flipud    = 0.0,
        fliplr    = 0.5,
        mosaic    = 1.0,
        mixup     = 0.1,
    )

    # ── Log final scalar metrics ──────────────────────────────────────────────
    rd = results.results_dict
    final_metrics = {
        "final/precision":  rd.get("metrics/precision(B)", 0),
        "final/recall":     rd.get("metrics/recall(B)", 0),
        "final/mAP50":      rd.get("metrics/mAP50(B)", 0),
        "final/mAP50-95":   rd.get("metrics/mAP50-95(B)", 0),
        "final/box_loss":   rd.get("train/box_loss", 0),
        "final/cls_loss":   rd.get("train/cls_loss", 0),
        "final/dfl_loss":   rd.get("train/dfl_loss", 0),
    }
    wandb.log(final_metrics)

    # ── Log curve images (PR, F1, P, R, confusion matrix) ────────────────────
    run_dir = Path(PROJECT) / RUN_NAME
    plot_files = [
        "PR_curve.png",
        "P_curve.png",
        "R_curve.png",
        "F1_curve.png",
        "confusion_matrix.png",
        "confusion_matrix_normalized.png",
        "results.png",
        "labels.jpg",
    ]
    wandb_images = {}
    for fname in plot_files:
        fpath = run_dir / fname
        if fpath.exists():
            key = fname.rsplit(".", 1)[0]
            wandb_images[f"curves/{key}"] = wandb.Image(str(fpath), caption=key)

    if wandb_images:
        wandb.log(wandb_images)
        print(f"\nLogged {len(wandb_images)} curve images to W&B ✅")

    # ── Log best.pt as a W&B model artifact ──────────────────────────────────
    best_weights = run_dir / "weights" / "best.pt"
    if best_weights.exists():
        artifact = wandb.Artifact(
            name="car-crash-yolov8n",
            type="model",
            description=f"YOLOv8n fine-tuned on car_crash_dataset — {EPOCHS} epochs",
            metadata=final_metrics,
        )
        artifact.add_file(str(best_weights), name="best.pt")
        run.log_artifact(artifact)
        print("Model artifact logged to W&B ✅")

    wandb.finish()

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(" Training Complete!")
    print(f"  Precision : {final_metrics['final/precision']:.4f}")
    print(f"  Recall    : {final_metrics['final/recall']:.4f}")
    print(f"  mAP50     : {final_metrics['final/mAP50']:.4f}")
    print(f"  mAP50-95  : {final_metrics['final/mAP50-95']:.4f}")
    print(f"  Best wts  : {best_weights}")
    print(f"  W&B run   : {run.url}")
    print("=" * 60)


if __name__ == "__main__":
    main()

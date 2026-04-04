import cv2
import numpy as np
import time
import os
from ultralytics import YOLO

MODEL_CANDIDATES = [
    ("best.pt", "Indian Roads Roboflow weights — preferred"),
    ("yolov8n.pt", "YOLOv8 nano — auto-downloads from Ultralytics"),
]

def verify():
    model = None
    model_name = ""
    for path, desc in MODEL_CANDIDATES:
        try:
            print(f"Trying to load {path} ({desc})...")
            # yolov8n.pt downloads automatically, best.pt might throw if not present
            if path == "best.pt" and not os.path.exists(path):
                print(f"Failed to load {path}: File not found")
                continue
            model = YOLO(path)
            model_name = path
            print(f"Successfully loaded {path}!")
            break
        except Exception as e:
            print(f"Failed to load {path}: {e}")
            
    if model is None:
        print("ERROR: No models could be loaded.")
        return
        
    print("-" * 40)
    print("VERIFYING WITH BLANK FRAME")
    blank = np.zeros((480, 640, 3), dtype=np.uint8)
    
    start_time = time.time()
    results = model(blank, verbose=False)
    inf_time = (time.time() - start_time) * 1000
    
    device = model.device.type
    
    print(f"Model ID:        {model_name}")
    print(f"Num Classes:     {len(model.names)}")
    names = list(model.names.values())
    if len(names) > 10:
        names_str = ", ".join(names[:5]) + " ... " + ", ".join(names[-2:])
    else:
        names_str = ", ".join(names)
    print(f"Classes:         {names_str}")
    print(f"Blank Inference: {inf_time:.2f} ms")
    print(f"Device:          {device.upper()}")
    
    print("-" * 40)
    print("VERIFYING WITH FOOTAGE (crash1.mp4, Frame 50)")
    
    cap = cv2.VideoCapture("footage/crash1.mp4")
    if not cap.isOpened():
        print("ERROR: Could not open footage/crash1.mp4")
        return
        
    cap.set(cv2.CAP_PROP_POS_FRAMES, 50)
    ret, frame = cap.read()
    if not ret:
        print("ERROR: Could not read frame 50")
        return
        
    frame = cv2.resize(frame, (640, 480))
    start_time = time.time()
    results = model(frame, conf=0.25, verbose=False) # lowered conf slightly to ensure we see detections
    actual_inf_time = (time.time() - start_time) * 1000
    
    detections = results[0].boxes
    print(f"Detections found: {len(detections)}")
    for box in detections:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        cls_name = model.names[cls_id]
        print(f" - {cls_name}: {conf:.2f}")
    
    print("-" * 40)
    print(f"\033[92mMODEL READY: {model_name} on {device.upper()} · {actual_inf_time:.1f}ms per frame\033[0m")
    
if __name__ == "__main__":
    verify()

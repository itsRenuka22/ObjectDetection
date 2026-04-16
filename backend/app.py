import os
import time
import base64
import tempfile
import traceback
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO

# ─── Paths ────────────────────────────────────────────────────────────────────

BACKEND_DIR = Path(__file__).parent
MODELS_DIR  = BACKEND_DIR.parent / "models"

# ─── Model loading ────────────────────────────────────────────────────────────

def try_load(filename: str, label: str):
    full = MODELS_DIR / filename
    if not full.exists():
        print(f"⚠️  Skipping {label} — file not found: {full}")
        return None
    try:
        model = YOLO(str(full))
        # Warmup inference with a tiny black image to verify the backend
        # actually works (e.g. onnxruntime present, TensorRT compatible).
        dummy = np.zeros((64, 64, 3), dtype=np.uint8)
        model(dummy, verbose=False)
        print(f"✅ Loaded {label}")
        return model
    except Exception as e:
        short = str(e).splitlines()[0]
        print(f"⚠️  Skipping {label} — {short}")
        return None

print("Loading models...")
CANDIDATES = {
    "yolov8_pytorch":  "yolov8n.pt",
    "yolov8_onnx":     "yolov8n.onnx",
    "yolov8_tensorrt": "yolov8n.engine",
    "rtdetr_pytorch":  "rtdetr-l.pt",
    "rtdetr_onnx":     "rtdetr-l.onnx",
    "rtdetr_tensorrt": "rtdetr-l.engine",
}

models: dict = {}
for name, filename in CANDIDATES.items():
    result = try_load(filename, name)
    if result is not None:
        models[name] = result

print(f"\n🚀 Available models: {list(models.keys())}\n")

# ─── COCO traffic classes ──────────────────────────────────────────────────────

ALLOWED_CLASSES = {
    0: "pedestrian",  # COCO "person"
    1: "bicycle",
    2: "car",
}

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="Object Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def decode_image(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image — unsupported format or corrupted file.")
    return img

def img_to_b64(img: np.ndarray) -> str:
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buf).decode("utf-8")

def safe_plot(results, names: dict) -> np.ndarray:
    """Call results[0].plot(), falling back to manual drawing if class IDs are missing from names."""
    try:
        return results[0].plot()
    except (KeyError, IndexError):
        img = results[0].orig_img.copy()
        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            label = names.get(cls_id, f"cls{cls_id}")
            conf  = float(box.conf[0])
            x1, y1, x2, y2 = (int(v) for v in box.xyxy[0])
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(img, f"{label} {conf:.2f}", (x1, max(y1 - 6, 12)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)
        return img

def run_detection(model, img: np.ndarray, model_name: str) -> tuple:
    """Return (detections, annotated_img, latency_ms)."""
    # TensorRT warmup
    if "tensorrt" in model_name:
        model(img, verbose=False)

    t0 = time.perf_counter()
    results = model(img, verbose=False)
    latency_ms = (time.perf_counter() - t0) * 1000

    annotated_img = safe_plot(results, model.names)
    detections = []
    for box in results[0].boxes:
        cls_id = int(box.cls[0])
        # Skip class IDs not in the names dict (malformed ONNX output)
        if cls_id not in model.names:
            continue
        if cls_id in ALLOWED_CLASSES:
            detections.append({
                "label":      ALLOWED_CLASSES[cls_id],  # "pedestrian" not "person"
                "confidence": round(float(box.conf[0]), 3),
                "bbox": {
                    "x1": round(float(box.xyxy[0][0])),
                    "y1": round(float(box.xyxy[0][1])),
                    "x2": round(float(box.xyxy[0][2])),
                    "y2": round(float(box.xyxy[0][3])),
                },
            })

    return detections, annotated_img, round(latency_ms, 2)

def process_video(model, video_path: str, model_name: str) -> tuple:
    """
    Run detection on every frame of a video.
    Returns (per_frame_detections, annotated_video_b64, total_latency_ms, fps).
    The annotated video is returned as a base64-encoded MP4.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video file.")

    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps    = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Limit processing to 300 frames to keep latency reasonable
    MAX_FRAMES = 300
    frame_limit = min(total_frames, MAX_FRAMES) if total_frames > 0 else MAX_FRAMES

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        out_path = tmp.name

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(out_path, fourcc, fps, (width, height))

    frame_detections = []
    total_latency    = 0.0
    frame_idx        = 0

    while frame_idx < frame_limit:
        ret, frame = cap.read()
        if not ret:
            break

        detections, annotated_frame, latency_ms = run_detection(model, frame, model_name)
        writer.write(annotated_frame)
        frame_detections.append({
            "frame":      frame_idx,
            "detections": detections,
            "latency_ms": latency_ms,
        })
        total_latency += latency_ms
        frame_idx += 1

    cap.release()
    writer.release()

    with open(out_path, "rb") as f:
        video_b64 = base64.b64encode(f.read()).decode("utf-8")
    os.unlink(out_path)

    return frame_detections, video_b64, round(total_latency, 2), fps, frame_idx


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Object Detection API is running 🚀", "models": list(models.keys())}


@app.get("/models")
def list_models():
    return {"models": list(models.keys())}


@app.post("/detect/image")
async def detect_image(
    file: UploadFile = File(...),
    model_name: str  = Query(default="yolov8_pytorch"),
):
    if model_name not in models:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{model_name}' not available. Choose from: {list(models.keys())}",
        )
    try:
        image_bytes = await file.read()
        img = decode_image(image_bytes)
        detections, annotated_img, latency_ms = run_detection(models[model_name], img, model_name)
        return {
            "model":          model_name,
            "latency_ms":     latency_ms,
            "num_detections": len(detections),
            "detections":     detections,
            "annotated_image": img_to_b64(annotated_img),
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail=traceback.format_exc())


@app.post("/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    model_name: str  = Query(default="yolov8_pytorch"),
):
    if model_name not in models:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{model_name}' not available. Choose from: {list(models.keys())}",
        )
    try:
        video_bytes = await file.read()
        suffix = Path(file.filename or "upload.mp4").suffix or ".mp4"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        frame_detections, video_b64, total_latency_ms, fps, frames_processed = process_video(
            models[model_name], tmp_path, model_name
        )
        os.unlink(tmp_path)

        # Aggregate unique labels across all frames
        all_labels: dict = {}
        for fd in frame_detections:
            for det in fd["detections"]:
                lbl = det["label"]
                if lbl not in all_labels or det["confidence"] > all_labels[lbl]:
                    all_labels[lbl] = det["confidence"]

        return {
            "model":             model_name,
            "frames_processed":  frames_processed,
            "fps":               fps,
            "total_latency_ms":  total_latency_ms,
            "avg_latency_ms":    round(total_latency_ms / max(frames_processed, 1), 2),
            "unique_detections": [{"label": k, "confidence": v} for k, v in all_labels.items()],
            "frame_detections":  frame_detections,
            "annotated_video":   video_b64,
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail=traceback.format_exc())


@app.post("/detect/compare")
async def compare_models(file: UploadFile = File(...)):
    """Run all loaded models on the same image."""
    try:
        image_bytes = await file.read()
        img = decode_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    comparison = {}
    for model_name, model in models.items():
        try:
            detections, annotated_img, latency_ms = run_detection(model, img, model_name)
            comparison[model_name] = {
                "latency_ms":      latency_ms,
                "num_detections":  len(detections),
                "detections":      detections,
                "annotated_image": img_to_b64(annotated_img),
            }
        except Exception as e:
            comparison[model_name] = {"error": str(e)}

    return {"comparison": comparison}

const payload = {
  sourceType: "camera",
  cameraId: "CAM-ITO-04",
  detections: [{ label: "accident", confidence: 0.94 }],
};

const url = process.env.NETRA_BASE_URL ?? "http://localhost:3000";
const apiKey = process.env.NETRA_DETECTOR_API_KEY ?? "";

const headers = { "Content-Type": "application/json" };
if (apiKey) {
  headers["x-api-key"] = apiKey;
}

const response = await fetch(`${url}/api/detector/events`, {
  method: "POST",
  headers,
  body: JSON.stringify(payload),
});

const body = await response.text();
console.log(`Status: ${response.status}`);
console.log(body);

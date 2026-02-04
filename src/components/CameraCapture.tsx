import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ocrText, setOcrText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("Camera access denied.");
    }
  };

  const stopCamera = (): void => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
  };

  const takePhotoAndScan = async (): Promise<void> => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    const imageData: string = canvas.toDataURL("image/png");
    await runOCR(imageData);
  };

  const runOCR = async (image: string): Promise<void> => {
    setLoading(true);
    setOcrText("");
    setError(null);

    try {
      const result = await Tesseract.recognize(image, "eng", {
        logger: m => console.log(m)
      });

      setOcrText(result.data.text.trim());
    } catch (err) {
      console.error(err);
      setError("Failed to extract text.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", maxWidth: "420px" }}
      />

      <button onClick={takePhotoAndScan} disabled={loading}>
        📸 Scan Text
      </button>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {loading && <p>🔍 Scanning…</p>}

      {ocrText && (
        <div style={{ marginTop: "16px" }}>
          <h4>Scanned Text</h4>
          <pre
            style={{
              textAlign: "left",
              whiteSpace: "pre-wrap",
              background: "#f5f5f5",
              padding: "12px",
              borderRadius: "6px"
            }}
          >
            {ocrText}
          </pre>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default CameraCapture;

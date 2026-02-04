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

  const preprocessImage = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and enhance contrast
    for (let i = 0; i < data.length; i += 4) {
      // Grayscale conversion
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // Increase contrast (adjust threshold)
      const contrast = 1.5;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const enhanced = factor * (gray - 128) + 128;
      
      // Apply threshold for better text detection
      const threshold = enhanced > 128 ? 255 : 0;
      
      data[i] = threshold;     // R
      data[i + 1] = threshold; // G
      data[i + 2] = threshold; // B
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const takePhoto = (): void => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    const processedImg = preprocessImage(canvas);
    runOCR(processedImg);
  };

  const runOCR = async (img: string): Promise<void> => {
    setLoading(true);
    setOcrText("");

    try {
      const result = await Tesseract.recognize(img, "eng", {
        logger: m => console.log(m)
      });

      setOcrText(result.data.text);
    } catch (err) {
      console.error(err);
      setError("OCR failed. Try again.");
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

      <button onClick={takePhoto} disabled={loading}>
        📸 Capture & Scan
      </button>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {loading && <p>🔍 Scanning image…</p>}

      {ocrText && (
        <div style={{ marginTop: "16px" }}>
          <h4>Extracted Text</h4>
          <pre style={{ textAlign: "left", whiteSpace: "pre-wrap" }}>
            {ocrText}
          </pre>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default CameraCapture;
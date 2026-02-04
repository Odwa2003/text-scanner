import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ocrText, setOcrText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanBox, setShowScanBox] = useState<boolean>(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const scanBox = { x: 0.1, y: 0.2, width: 0.8, height: 0.4 }; // Relative to video size

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

    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);

    // Calculate crop area based on scan box
    const cropX = video.videoWidth * scanBox.x;
    const cropY = video.videoHeight * scanBox.y;
    const cropWidth = video.videoWidth * scanBox.width;
    const cropHeight = video.videoHeight * scanBox.height;

    console.log('Crop area:', { cropX, cropY, cropWidth, cropHeight });

    // Set canvas to cropped size
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw only the cropped portion
    ctx.drawImage(
      video,
      cropX, cropY, cropWidth, cropHeight,  // Source rectangle
      0, 0, cropWidth, cropHeight            // Destination rectangle
    );

    // Show the captured image before preprocessing
    const capturedImg = canvas.toDataURL("image/png");
    setCapturedImage(capturedImg);

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
    <div style={{ textAlign: "center", padding: "20px" }}>
      <div style={{ position: "relative", display: "inline-block", maxWidth: "420px", width: "100%" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", display: "block", borderRadius: "8px" }}
        />
        
        {showScanBox && (
          <div
            style={{
              position: "absolute",
              left: `${scanBox.x * 100}%`,
              top: `${scanBox.y * 100}%`,
              width: `${scanBox.width * 100}%`,
              height: `${scanBox.height * 100}%`,
              border: "3px solid #00ff00",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
              pointerEvents: "none",
              boxSizing: "border-box"
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "#00ff00",
                fontSize: "14px",
                fontWeight: "bold",
                textShadow: "0 0 4px black",
                pointerEvents: "none"
              }}
            >
              Align text here
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: "16px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
        <button 
          onClick={takePhoto} 
          disabled={loading}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            borderRadius: "8px",
            border: "none",
            background: loading ? "#ccc" : "#007bff",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          📸 Capture & Scan
        </button>
        
        <button 
          onClick={() => setShowScanBox(!showScanBox)}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "2px solid #007bff",
            background: "white",
            color: "#007bff",
            cursor: "pointer"
          }}
        >
          {showScanBox ? "Hide" : "Show"} Scan Box
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {loading && <p style={{ fontSize: "16px", color: "#666" }}>🔍 Scanning image…</p>}

      {capturedImage && (
        <div style={{ marginTop: "16px" }}>
          <h4>Captured Area (Cropped)</h4>
          <img 
            src={capturedImage} 
            alt="Captured" 
            style={{ 
              maxWidth: "100%", 
              border: "2px solid #007bff", 
              borderRadius: "8px" 
            }} 
          />
        </div>
      )}

      {ocrText && (
        <div style={{ marginTop: "16px", textAlign: "left", maxWidth: "420px", margin: "16px auto" }}>
          <h4>Extracted Text</h4>
          <pre style={{ 
            whiteSpace: "pre-wrap", 
            background: "#f5f5f5", 
            padding: "12px", 
            borderRadius: "6px",
            fontSize: "14px"
          }}>
            {ocrText}
          </pre>
        </div>
      )}

      {error && <p style={{ color: "red", marginTop: "16px" }}>{error}</p>}
    </div>
  );
};

export default CameraCapture;
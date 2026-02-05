import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16/9 }
        },
        audio: false
      });
      if (videoRef.current) {
        try {
          (videoRef.current as HTMLVideoElement).srcObject = stream;
        } catch (e) {
          // @ts-ignore
          videoRef.current.src = URL.createObjectURL(stream);
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    const stream = (videoRef.current && (videoRef.current.srcObject as MediaStream | null)) || null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      try {
        (videoRef.current as HTMLVideoElement).srcObject = null;
      } catch {
        // @ts-ignore
        videoRef.current.src = "";
      }
    }
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || video.clientWidth;
    const height = video.videoHeight || video.clientHeight;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { 
      alpha: false,
      willReadFrequently: false 
    });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, 0, 0, width, height);

    const imageData = canvas.toDataURL("image/jpeg", 0.95);
    setImage(imageData);
    
    // Automatically extract text after capturing
    await extractText(imageData);
  };

  const extractText = async (imageData: string) => {
    setIsProcessing(true);
    setExtractedText("");
    setProgress(0);

    try {
      const result = await Tesseract.recognize(
        imageData,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );
      
      if (result.data.text.trim()) {
        setExtractedText(result.data.text);
      } else {
        setExtractedText("No text found in image.");
      }
    } catch (error) {
      console.error("OCR error:", error);
      setExtractedText("Error extracting text. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const retakePhoto = () => {
    setImage(null);
    setExtractedText("");
    setProgress(0);
  };

  return (
    <div style={{ textAlign: "center", padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "20px" }}>📸 Text Scanner</h2>
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ 
          width: "100%", 
          borderRadius: "8px",
          display: image ? "none" : "block",
          border: "2px solid #ddd"
        }}
      />

      {image && (
        <img 
          src={image} 
          alt="Captured" 
          style={{ 
            width: "100%", 
            borderRadius: "8px",
            border: "2px solid #ddd"
          }} 
        />
      )}

      <div style={{ margin: "20px 0" }}>
        {!image ? (
          <button 
            onClick={takePhoto}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              cursor: "pointer",
              borderRadius: "5px",
              border: "none",
              background: "#007bff",
              color: "white",
              fontWeight: "bold"
            }}
          >
            📸 Capture & Extract Text
          </button>
        ) : (
          <button 
            onClick={retakePhoto}
            disabled={isProcessing}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              cursor: isProcessing ? "not-allowed" : "pointer",
              borderRadius: "5px",
              border: "none",
              background: isProcessing ? "#ccc" : "#6c757d",
              color: "white",
              fontWeight: "bold"
            }}
          >
            🔄 Retake
          </button>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {isProcessing && (
        <div style={{
          padding: "20px",
          background: "#f8f9fa",
          borderRadius: "5px",
          margin: "20px 0"
        }}>
          <p style={{ margin: "0 0 10px 0", color: "#666" }}>🔍 Extracting text...</p>
          <div style={{
            width: "100%",
            height: "20px",
            background: "#e0e0e0",
            borderRadius: "10px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${progress}%`,
              height: "100%",
              background: "#007bff",
              transition: "width 0.3s ease"
            }} />
          </div>
          <p style={{ margin: "10px 0 0 0", color: "#666", fontSize: "14px" }}>{progress}%</p>
        </div>
      )}

      {extractedText && !isProcessing && (
        <div style={{
          padding: "20px",
          background: "#f8f9fa",
          borderRadius: "5px",
          textAlign: "left",
          border: "2px solid #28a745"
        }}>
          <h3 style={{ marginTop: 0, color: "#28a745" }}>✅ Extracted Text:</h3>
          <pre style={{ 
            whiteSpace: "pre-wrap", 
            wordWrap: "break-word",
            fontFamily: "inherit",
            margin: 0,
            fontSize: "14px",
            lineHeight: "1.6",
            color:"black"
          }}>
            {extractedText}
          </pre>
        </div>
      )}
    </div>
  );
}
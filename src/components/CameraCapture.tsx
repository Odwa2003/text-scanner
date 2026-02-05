import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [frameWidth, setFrameWidth] = useState<number>(80);
  const [frameHeight, setFrameHeight] = useState<number>(60);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: "environment" },
          width: { ideal: 3840 },  // 4K resolution
          height: { ideal: 2160 },
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

  // Image preprocessing for better OCR accuracy
  const preprocessImage = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/jpeg", 1.0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and increase contrast
    for (let i = 0; i < data.length; i += 4) {
      // Grayscale conversion
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      // Increase contrast (simple threshold)
      const threshold = 128;
      const value = avg > threshold ? 255 : 0;
      
      data[i] = value;     // Red
      data[i + 1] = value; // Green
      data[i + 2] = value; // Blue
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/jpeg", 1.0);
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

    // Store original image for display
    const originalImage = canvas.toDataURL("image/jpeg", 1.0);
    setImage(originalImage);
    
    // Preprocess image for OCR
    const processedImage = preprocessImage(canvas);
    
    // Extract text from preprocessed image
    await extractText(processedImage);
  };

  const extractText = async (imageData: string) => {
    setIsProcessing(true);
    setExtractedText("");
    setProgress(0);

    try {
      // Create worker with character whitelist
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      // Set parameters to only recognize letters, numbers, and spaces
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-0123456789 ',
      });

      const result = await worker.recognize(imageData);
      
      await worker.terminate();
      
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
    <div style={{ textAlign: "center", padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "10px" }}>📸 Text Scanner</h2>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
        💡 Tips: Hold phone steady, ensure good lighting, and keep text flat & in focus
      </p>
      
      <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
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
        
        {/* Guideline overlay for better framing */}
        {!image && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: `${frameWidth}%`,
            height: `${frameHeight}%`,
            border: "3px dashed rgba(0, 123, 255, 0.6)",
            borderRadius: "8px",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.1)",
            transition: "width 0.2s ease, height 0.2s ease"
          }}>
            <span style={{ color: "white", fontSize: "14px", fontWeight: "bold", textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
              Align text here
            </span>
          </div>
        )}
      </div>

      {/* Frame size controls */}
      {!image && (
        <div style={{ 
          margin: "20px 0", 
          padding: "15px", 
          background: "#f8f9fa", 
          borderRadius: "8px",
          textAlign: "left"
        }}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>
              Frame Width: {frameWidth}%
            </label>
            <input 
              type="range" 
              min="30" 
              max="95" 
              value={frameWidth}
              onChange={(e) => setFrameWidth(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>
              Frame Height: {frameHeight}%
            </label>
            <input 
              type="range" 
              min="20" 
              max="90" 
              value={frameHeight}
              onChange={(e) => setFrameHeight(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}

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
              fontWeight: "bold",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
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
              fontWeight: "bold",
              boxShadow: isProcessing ? "none" : "0 2px 4px rgba(0,0,0,0.2)"
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
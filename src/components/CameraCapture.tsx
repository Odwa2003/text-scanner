import { useEffect, useRef, useState } from "react";

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

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

    try {
      const base64Data = imageData.split(',')[1];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: base64Data
                  }
                },
                {
                  type: "text",
                  text: "Extract all text from this image. Return only the text content, nothing else."
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      
      if (data.content && data.content[0] && data.content[0].text) {
        setExtractedText(data.content[0].text);
      } else if (data.error) {
        setExtractedText(`Error: ${data.error.message || 'Failed to extract text'}`);
      } else {
        setExtractedText("No text found in image.");
      }
    } catch (error) {
      console.error("OCR error:", error);
      setExtractedText("Error extracting text. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const retakePhoto = () => {
    setImage(null);
    setExtractedText("");
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
          <p style={{ margin: 0, color: "#666" }}>🔍 Extracting text...</p>
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
            lineHeight: "1.6"
          }}>
            {extractedText}
          </pre>
        </div>
      )}
    </div>
  );
}
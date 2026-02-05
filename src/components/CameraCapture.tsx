import { useEffect, useRef, useState } from "react";

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: "environment" },
          width: { ideal: 1920 },  // Request higher resolution
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

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Use actual video dimensions for full quality
    const width = video.videoWidth || video.clientWidth;
    const height = video.videoHeight || video.clientHeight;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { 
      alpha: false,  // Disable alpha channel for better performance
      willReadFrequently: false 
    });
    if (!ctx) return;

    // Enable high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw the image
    ctx.drawImage(video, 0, 0, width, height);

    // Use JPEG with high quality (0.95 = 95% quality)
    const imageData = canvas.toDataURL("image/jpeg", 0.95);
    setImage(imageData);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "100%", maxWidth: "400px" }}
      />

      <button onClick={takePhoto}>📸 Capture</button>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {image && (
        <div>
          <h4>Captured Image:</h4>
          <img src={image} alt="Captured" style={{ width: "100%", maxWidth: "400px" }} />
        </div>
      )}
    </div>
  );
}
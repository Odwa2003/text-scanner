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
        video: { facingMode: { exact: "environment" } },
        audio: false
      });
      if (videoRef.current) {
        try {
          (videoRef.current as HTMLVideoElement).srcObject = stream;
        } catch (e) {
          // Fallback for older browsers
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

    const width = (video.videoWidth && video.videoWidth > 0) ? video.videoWidth : video.clientWidth;
    const height = (video.videoHeight && video.videoHeight > 0) ? video.videoHeight : video.clientHeight;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    const imageData = canvas.toDataURL("image/png");
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
          <img src={image} alt="Captured" style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
}
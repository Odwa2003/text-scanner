import { useEffect, useRef, useState } from "react";

const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (): Promise<void> => {
    try {
      const stream: MediaStream =
        await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false
        });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setError("Unable to access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = (): void => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;

    stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
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

    const imageData: string = canvas.toDataURL("image/png");
    setImage(imageData);
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

      <div style={{ marginTop: "12px" }}>
        <button onClick={takePhoto}>📸 Capture</button>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {error && <p style={{ color: "red" }}>{error}</p>}

      {image && (
        <div style={{ marginTop: "16px" }}>
          <h4>Captured Image</h4>
          <img
            src={image}
            alt="Captured"
            style={{ width: "100%", maxWidth: "420px" }}
          />
        </div>
      )}
    </div>
  );
};

export default CameraCapture;

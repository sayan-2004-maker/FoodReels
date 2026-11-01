import React, { useEffect, useRef, useState } from 'react';

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function CameraCapture({ kind, onClose, onCapture }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [facing, setFacing] = useState('user');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [flash, setFlash] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startCamera = async mode => {
    setError(''); setReady(false); stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: kind === 'video'
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setReady(true);
    } catch (e) {
      setError('Camera access was blocked. Allow camera permission in your browser and try again.');
    }
  };

  useEffect(() => { startCamera(facing); return () => { stopStream(); clearInterval(timerRef.current); }; }, [facing]);

  const takePhoto = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setFlash(true); setTimeout(() => setFlash(false), 180);
    canvas.toBlob(blob => {
      if (!blob) return;
      onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      onCapture(new File([blob], `reel-${Date.now()}.webm`, { type: 'video/webm' }));
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true); setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => {
      if (s >= 59) { stopRecording(); return s; }
      return s + 1;
    }), 1000);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleShutter = () => {
    if (kind === 'photo') return takePhoto();
    recording ? stopRecording() : startRecording();
  };

  const flip = () => { if (recording) return; setFacing(f => (f === 'user' ? 'environment' : 'user')); };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="capture-modal glass" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="capture-stage">
          {error ? (
            <div className="capture-error">
              <span>📵</span>
              <p>{error}</p>
              <button className="primary-wide" onClick={() => startCamera(facing)}>Try again</button>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="capture-preview" muted playsInline />
              {flash && <div className="capture-flash" />}
              {!ready && <div className="capture-loading"><div className="spinner" /><span>Waking up the camera…</span></div>}
              {recording && <div className="capture-timer"><i /> {fmt(seconds)}</div>}
              <button className="capture-flip" onClick={flip} title="Flip camera">⟲</button>
            </>
          )}
        </div>
        {!error && (
          <div className="capture-controls">
            <span className="capture-hint">{kind === 'photo' ? 'Tap to snap your cover photo' : recording ? 'Tap again to finish recording' : 'Tap to start recording (max 60s)'}</span>
            <button className={`capture-shutter ${kind === 'video' ? 'video' : ''} ${recording ? 'is-recording' : ''}`} onClick={handleShutter} disabled={!ready} aria-label="Capture">
              <span />
            </button>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

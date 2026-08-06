import { useState, useRef, useEffect, useCallback } from "react";
import "../../../style/voiceRecorder.css";

import KeyboardVoiceIcon from "@mui/icons-material/KeyboardVoice";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import MicNoneIcon from "@mui/icons-material/MicNone";

import { useAccurateTimer } from "../../../hooks/useAccurateTimer";
import {analyzeAudioFrame, drawBarsForVoice } from "../../../hooks/drawbars";

const MIN_RECORDING_DURATION = 500;

export const VoiceRecorder = ({
  onSend,
  onCancel,
  audioPlayerComponent: AudioPlayer,
  primaryColor = "#0af",
  positionSetRight = "0px"
}) => {

  const [status, setStatus] = useState("idle");
  const [showModal, setShowModal] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordedPeaks,setRecordedPeaks] = useState([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const peaksRef = useRef([]);
  const fullPeaksRef = useRef([]);
  const startTimeRef = useRef(null);
const audioStateRef = useRef({
  max: 0,
  prev: 0,
  calibrated: false,
  calibrationFrames: 0
});

const { time, start, pause, resume, stop } = useAccurateTimer();

const lastTime = useRef(0);
const FPS = 20;
const pendingSendRef = useRef(false);

/* ================= RECORD LOOP ================= */
const recordLoop = useCallback((rafTime) => {
  if (!lastTime.current) lastTime.current = rafTime;

  if (rafTime - lastTime.current < 1000 / FPS) {
    animationRef.current = requestAnimationFrame(recordLoop);
    return;
  }
  lastTime.current = rafTime;

  const canvas = canvasRef.current;
  const analyser = analyserRef.current;
  if (!canvas || !analyser) return;
  const peak = analyzeAudioFrame(analyser, audioStateRef.current);
    peaksRef.current.unshift(peak);
    fullPeaksRef.current.push(peak)
const normalized = peaksRef.current;

const maxBars = Math.floor(canvas.width / 6);

if (peaksRef.current.length > maxBars) {
  peaksRef.current.pop();
}

  drawBarsForVoice({
        canvas,
        peaks: normalized,
        progress: 1,
        direction:"rtl"
    });
  animationRef.current = requestAnimationFrame(recordLoop);
},[]);


/* ================= START LOOP WHEN READY ================= */

useEffect(() => {

  if (status === "recording") {

    animationRef.current = requestAnimationFrame(recordLoop);

  }

  return () => cancelAnimationFrame(animationRef.current);

}, [status,recordLoop]);


/* ================= CLEANUP ================= */

const cleanup = () => {

  cancelAnimationFrame(animationRef.current);

  if (audioContextRef.current) {
    audioContextRef.current.close();
    audioContextRef.current = null;
  }

  if (streamRef.current) {
    streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

};


/* ================= START RECORDING ================= */

const startRecording = async () => {
  try {
    setShowModal(true);
    setAudioBlob(null);
    startTimeRef.current = Date.now();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    streamRef.current = stream;

    const audioContext = new AudioContext();

    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);

    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;

    source.connect(analyser);

    analyserRef.current = analyser;

    const mediaRecorder = new MediaRecorder(stream, {
    mimeType: "audio/webm;codecs=opus",
});

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {

      if (e.data.size > 0) chunksRef.current.push(e.data);

    };

    mediaRecorder.onstop = () => {
      cleanup();
      const duration = Date.now() - startTimeRef.current;
      if (duration < MIN_RECORDING_DURATION) {
        handleCancel();
        return;
      }
      const blob = new Blob(chunksRef.current,{type:"audio/webm;codecs=opus"});
      if (pendingSendRef.current) {
          pendingSendRef.current = false;
          onSend && onSend(blob);
          handleCancel(); // ← handles all the reset
          return;
      }
      setAudioBlob(blob);
      setRecordedPeaks([...fullPeaksRef.current]);
    };

    peaksRef.current = [];
    fullPeaksRef.current = [];
    chunksRef.current = [];

    mediaRecorder.start(100);

    start();
    setStatus("recording");

  } catch (err) {

    setShowModal(false);

  }

};


/* ================= PAUSE / RESUME ================= */

const pauseRecording = () => {

  mediaRecorderRef.current?.pause();
  pause();
  const blob = new Blob(chunksRef.current,{type:"audio/webm;codecs=opus"});
  setAudioBlob(blob);
  setRecordedPeaks([...fullPeaksRef.current]);
  cancelAnimationFrame(animationRef.current);

  setStatus("paused");

};

const resumeRecording = () => {

  mediaRecorderRef.current?.resume();
  resume();

  setStatus("recording");

};


/* ================= CANCEL ================= */

const handleCancel = () => {

  stop();
  cleanup();

  setStatus("idle");
  setShowModal(false);
  setAudioBlob(null);

  chunksRef.current = [];

  onCancel && onCancel();

};


/* ================= SEND ================= */

const handleSend = () => {
   if (status === "recording") {
    pendingSendRef.current = true;
    mediaRecorderRef.current?.stop();
    return;
   }
  if (audioBlob) onSend && onSend(audioBlob);
  handleCancel();
};


/* ================= TIMER FORMAT ================= */

const formatTime = (sec) => {

  const m = String(Math.floor(sec / 60)).padStart(2,"0");
  const s = String(sec % 60).padStart(2,"0");

  return `${m}:${s}`;

};


/* ================= UI ================= */

return (

<div className="vr-container">

  <KeyboardVoiceIcon
    className="vr-button"
    onClick={startRecording}
    style={{ color: primaryColor }}
  />

  {showModal && (

    <div className="vr-modal animate-in" style={{right:positionSetRight}}>

      <div className="vr-modal-content">

        <div className="canvasAndAudioTimerInner">

          {status === "recording" && (

            <div className="whileRecordingCanvas">

              <canvas
                ref={canvasRef}
                width={250}
                height={50}
              />

              <div className="vr-timer">
                {formatTime(time)}
              </div>

            </div>

          )}

          {status === "paused" && AudioPlayer && audioBlob && (

            <AudioPlayer
              source={audioBlob}
              peaks={[...recordedPeaks]}
              Cwidth={220}
              Cheight={50}
              isVoice = {true}
            />

          )}

        </div>

        <div className="isRecordingContainer">

          <DeleteIcon
            onClick={handleCancel}
            className="deleteIconVoice"
          />

          {status === "recording" && (
            <PauseRoundedIcon onClick={pauseRecording}/>
          )}

          {status === "paused" && (
            <MicNoneIcon
              onClick={resumeRecording}
              className="pausedAudiobtn"
            />
          )}

          <SendIcon
            onClick={handleSend}
            style={{color:"#1e9dff",cursor:"pointer"}}
          />

        </div>

      </div>

    </div>

  )}

</div>

);

};
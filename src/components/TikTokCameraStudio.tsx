import React, { useState, useEffect, useRef } from 'react';
import {
  X, RefreshCw, Volume2, Check, ShieldCheck, Languages, Play, Square, AlertCircle
} from 'lucide-react';
import { UserProfile, PhoneProduct } from '../types';
import {
  InterviewLanguage,
  get10CoreMobileQuestions,
  formatSalutationGreeting
} from '../data/interviewQuestions';

interface DetectedHardwareSpecs {
  os: string;
  browser: string;
  resolution: string;
  pixelRatio: number;
  cores?: number;
  memoryGb?: number;
  verifiedBadge: string;
}

interface TikTokCameraStudioProps {
  user: UserProfile;
  currentPhone: PhoneProduct;
  selectedLanguage: InterviewLanguage;
  onChangeLanguage: (lang: InterviewLanguage) => void;
  selectedVoiceTone: string;
  onChangeVoiceTone: (toneId: string) => void;
  recordingAtmosphere: 'bedroom' | 'studio' | 'hype';
  onChangeAtmosphere: (atm: 'bedroom' | 'studio' | 'hype') => void;
  activeGender: 'female' | 'male';
  activeTitle: 'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.';
  onChangeGender: (gender: 'female' | 'male') => void;
  onChangeTitle: (title: 'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.') => void;
  customReviewerName: string;
  onChangeReviewerName: (name: string) => void;
  detectedSpecs: DetectedHardwareSpecs;
  termsAccepted: boolean;
  onToggleTerms: (checked: boolean) => void;
  hidePhoneModelInReview: boolean;
  onToggleHidePhoneModel: (checked: boolean) => void;
  onFinishRecording: (reviewData: {
    phone: string;
    seconds: number;
    stars: number;
    answers: Record<string, string>;
    allAnswers: Record<number, string>;
    productPhotos: string[];
    language: string;
    hidePhoneModel: boolean;
    verifiedDevice: string;
    privacyProtected: boolean;
    videoBlob?: Blob;
    videoUrl?: string;
  }) => void;
  onExit: () => void;
  onOpenPhoneSelector: () => void;
  onUpdateUser: (u: Partial<UserProfile>) => void;
  playAudioEffect: (type: 'ring' | 'shutter' | 'chime' | 'click' | 'clapper' | 'pop') => void;
}

export const TikTokCameraStudio: React.FC<TikTokCameraStudioProps> = ({
  user,
  currentPhone,
  selectedLanguage,
  onChangeLanguage,
  selectedVoiceTone,
  activeGender,
  activeTitle,
  customReviewerName,
  detectedSpecs,
  termsAccepted,
  onToggleTerms,
  hidePhoneModelInReview,
  onFinishRecording,
  onExit,
  playAudioEffect,
}) => {
  // Studio states: minimal, clean, responsive
  const [recState, setRecState] = useState<'ready' | 'recording'>('ready');
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [useFrontCamera, setUseFrontCamera] = useState<boolean>(true);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  // 10 Interactive MCQ Questions state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const latestAnswersRef = useRef<Record<number, string>>({});
  const [animatingOptionIdx, setAnimatingOptionIdx] = useState<number | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [answerRequiredNotice, setAnswerRequiredNotice] = useState<boolean>(false);

  // Hardware Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recorderMimeRef = useRef<string>('video/webm');
  const timerIntervalRef = useRef<any>(null);
  const recordStartTimeRef = useRef<number>(0);

  // 10 Core Mobile Questions in selected language
  const questions = get10CoreMobileQuestions(currentPhone, selectedLanguage);
  const currentQ = questions[currentQuestionIdx] || questions[0];

  // Personalized salutation
  const formalGreeting = formatSalutationGreeting(
    customReviewerName || user?.name || (activeGender === 'female' ? 'Sita Sharma' : 'Pawan Bahadur Sarki'),
    activeGender,
    activeTitle,
    selectedLanguage
  );

  // Sleek verified mobile badge label showing the EXACT selected smartphone model and brand
  const autoDetectedLabel = `🔒 Verified ${currentPhone.name}`;

  // Physical Web Camera Initialization (real user face feed)
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCam = async () => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: useFrontCamera ? 'user' : { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: true,
          });
          activeStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        } catch {
          // Camera permission denied or device without webcam; fallback to procedural canvas
        }
      }
    };
    startCam();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [useFrontCamera]);

  // Procedural canvas visualizer loop (clean shader simulation when no webcam permission)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.015;
      const width = (canvas.width = canvas.parentElement?.clientWidth || 360);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 640);

      const grad = ctx.createRadialGradient(
        width / 2 + Math.sin(time) * 35,
        height / 2 + Math.cos(time * 0.8) * 35,
        20,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.8
      );

      grad.addColorStop(0, '#1E293B');
      grad.addColorStop(0.6, '#0F172A');
      grad.addColorStop(1, '#020617');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Soft face depth lighting simulation
      ctx.save();
      ctx.beginPath();
      const radius = 130 + Math.sin(time * 1.5) * 15;
      const x = width / 2;
      const y = height / 2.3;
      const nodeGrad = ctx.createRadialGradient(x, y, 10, x, y, radius);
      nodeGrad.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
      nodeGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nodeGrad;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Subtle studio status overlay on fallback canvas so non-webcam recordings still carry crisp context
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentPhone.name} · Video Feedback Studio`, width / 2, height * 0.34);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(customReviewerName || user?.name || 'Verified Reviewer', width / 2, height * 0.38);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [currentPhone.name, customReviewerName, user?.name]);

  // Format recording timer: 00:00
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // AI Speech Synthesis with current language
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    if (selectedLanguage === 'ne') utter.lang = 'ne-NP';
    else if (selectedLanguage === 'hi') utter.lang = 'hi-IN';
    else if (selectedLanguage === 'es') utter.lang = 'es-ES';
    else utter.lang = 'en-US';

    if (selectedVoiceTone === 'bedroom_whisper') {
      utter.rate = 0.88;
      utter.pitch = 0.95;
    } else {
      utter.rate = 0.98;
      utter.pitch = 1.0;
    }

    utter.onstart = () => setIsAiSpeaking(true);
    utter.onend = () => setIsAiSpeaking(false);
    utter.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utter);
  };

  // 1-Click Camera Flip
  const flipCamera = () => {
    setUseFrontCamera((prev) => !prev);
    playAudioEffect('click');
  };

  // 1-Click Language Switcher (English, Nepali, Hindi, Spanish)
  const cycleLanguage = () => {
    const langs: InterviewLanguage[] = ['en', 'ne', 'hi', 'es'];
    const nextIdx = (langs.indexOf(selectedLanguage) + 1) % langs.length;
    const nextLang = langs[nextIdx];
    onChangeLanguage(nextLang);
    playAudioEffect('click');

    // If currently recording, immediately re-prompt the current question in the new language
    if (recState === 'recording') {
      const updatedQuestions = get10CoreMobileQuestions(currentPhone, nextLang);
      const q = updatedQuestions[currentQuestionIdx];
      if (q) {
        const textToPrompt = currentQuestionIdx === 0
          ? q.voiceText(formalGreeting, currentPhone.name)
          : q.voiceText('', currentPhone.name);
        setTimeout(() => speakText(textToPrompt), 120);
      }
    }
  };

  // Start real MediaRecorder video capture (live webcam stream or canvas fallback)
  const startMediaCapture = () => {
    recordedChunksRef.current = [];
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return;
    try {
      const stream: MediaStream | null =
        activeStreamRef.current ||
        (canvasRef.current && typeof canvasRef.current.captureStream === 'function'
          ? canvasRef.current.captureStream(24)
          : null);
      if (!stream) return;

      const candidateTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const chosenType = candidateTypes.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
      const recorder = chosenType
        ? new MediaRecorder(stream, { mimeType: chosenType })
        : new MediaRecorder(stream);

      recorderMimeRef.current = recorder.mimeType || chosenType || 'video/webm';
      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };
      recorder.start(400);
      mediaRecorderRef.current = recorder;
    } catch {
      // Recorder unavailable in headless environment; fallback handled on finish
    }
  };

  const stopMediaCapture = (): Promise<{ videoBlob?: Blob; videoUrl?: string }> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: recorderMimeRef.current || 'video/webm' });
          resolve({ videoBlob: blob, videoUrl: URL.createObjectURL(blob) });
        } else {
          resolve({});
        }
        return;
      }

      let resolved = false;
      const finalize = () => {
        if (resolved) return;
        resolved = true;
        mediaRecorderRef.current = null;
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: recorderMimeRef.current || 'video/webm' });
          resolve({ videoBlob: blob, videoUrl: URL.createObjectURL(blob) });
        } else {
          resolve({});
        }
      };

      const timeoutGuard = setTimeout(finalize, 450);
      recorder.onstop = () => {
        clearTimeout(timeoutGuard);
        finalize();
      };
      try {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
      } catch {
        // Ignore if recorder does not support manual data flush
      }
      try {
        recorder.stop();
      } catch {
        clearTimeout(timeoutGuard);
        finalize();
      }
    });
  };

  const beginRecordingSession = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    latestAnswersRef.current = {};
    setUserAnswers({});
    setAnswerRequiredNotice(false);
    setRecState('recording');
    setSecondsElapsed(0);
    setCurrentQuestionIdx(0);
    playAudioEffect('clapper');
    startMediaCapture();

    recordStartTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - recordStartTimeRef.current) / 1000;
      setSecondsElapsed(elapsed);
    }, 200);

    // AI speaks Question 1 aloud only once recording starts
    const q1 = questions[0];
    const q1Prompt = q1.voiceText(formalGreeting, currentPhone.name);
    speakText(q1Prompt);
  };

  // Start / Stop Recording Session
  const toggleRecord = () => {
    if (recState === 'recording') {
      finishRecordingSession();
    } else {
      if (!termsAccepted) {
        setShowTermsModal(true);
        return;
      }
      beginRecordingSession();
    }
  };

  // 1-Tap MCQ Option Handler
  const handleSelectOption = (optText: string, optIdx: number) => {
    playAudioEffect('chime');
    setAnimatingOptionIdx(optIdx);
    setAnswerRequiredNotice(false);

    const updatedAnswers = {
      ...latestAnswersRef.current,
      [currentQuestionIdx]: optText,
    };
    latestAnswersRef.current = updatedAnswers;
    setUserAnswers(updatedAnswers);

    const ack = currentQ?.aiAcknowledgement
      ? currentQ.aiAcknowledgement('', currentPhone.name, currentQuestionIdx + 1)
      : 'Great!';

    setTimeout(() => {
      setAnimatingOptionIdx(null);
      if (currentQuestionIdx >= questions.length - 1) {
        speakText(ack);
        setTimeout(() => finishRecordingSession(updatedAnswers), 950);
      } else {
        const nextIdx = currentQuestionIdx + 1;
        setCurrentQuestionIdx(nextIdx);
        const nextQ = questions[nextIdx];
        speakText(`${ack} ${nextQ.voiceText('', currentPhone.name)}`);
      }
    }, 350);
  };

  // Finish session & bundle feedback (reads latestAnswersRef to avoid stale closures)
  const finishRecordingSession = async (overrideAnswers?: Record<number, string>) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsAiSpeaking(false);
    setRecState('ready');

    const { videoBlob, videoUrl } = await stopMediaCapture();
    const finalAnswers = overrideAnswers || latestAnswersRef.current || userAnswers;

    const compiledAnswers: Record<string, string> = {
      like: finalAnswers[3] || finalAnswers[0] || 'Vibrant 120Hz display and high detail daylight photos.',
      dislike: finalAnswers[8] || 'Slight warmth during intense 3D gaming.',
      comfort: finalAnswers[1] || 'Lightweight ergonomic frame.',
      improve: finalAnswers[9] || 'Even faster charging and battery optimization.',
    };

    questions.forEach((q, idx) => {
      if (finalAnswers[idx]) {
        compiledAnswers[q.k] = finalAnswers[idx];
      }
    });

    const elapsedRounded = recordStartTimeRef.current
      ? Math.max(1, Math.round((Date.now() - recordStartTimeRef.current) / 1000))
      : Math.round(secondsElapsed) || 1;

    onFinishRecording({
      phone: currentPhone.id,
      seconds: elapsedRounded,
      stars: finalAnswers[9]?.includes('3') ? 3 : finalAnswers[9]?.includes('4') ? 4 : 5,
      answers: compiledAnswers,
      allAnswers: finalAnswers,
      productPhotos: [currentPhone.img],
      language: selectedLanguage,
      hidePhoneModel: hidePhoneModelInReview,
      verifiedDevice: autoDetectedLabel,
      privacyProtected: true,
      videoBlob,
      videoUrl,
    });
  };

  // Language Flag helper
  const getLanguageLabel = () => {
    switch (selectedLanguage) {
      case 'ne': return '🇳🇵 NE';
      case 'hi': return '🇮🇳 HI';
      case 'es': return '🇪🇸 ES';
      default: return '🇬🇧 EN';
    }
  };

  return (
    <div className="relative w-full h-full max-w-md mx-auto bg-black text-white sm:rounded-[44px] overflow-hidden shadow-2xl flex flex-col justify-between select-none">
      
      {/* =========================================================
          1. IMMERSIVE FULL-SCREEN CAMERA (FACE VIEW)
          ========================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Fallback Canvas */}
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {/* Live Physical Webcam Stream (Full Screen Viewport) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: useFrontCamera ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* Subtle Top & Bottom Vignette (Leaves center 100% crystal clear for face) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none" />
      </div>

      {/* =========================================================
          2. MINIMALIST TOP BAR
          🔒 Auto-Detected Device Badge & Minimal Close Button [X]
          ========================================================= */}
      <header className="relative z-20 pt-4 px-4 flex items-center justify-between">
        {/* Sleek Auto-Detected Hardware Tag */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-white shadow-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-mono text-[11px] font-bold tracking-tight text-white/95 truncate max-w-[190px]">
            {autoDetectedLabel}
          </span>
        </div>

        {/* Center Live Recording Timer (only shows while recording) */}
        {recState === 'recording' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white font-mono text-xs font-bold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>
        )}

        {/* Close Button [X] */}
        <button
          type="button"
          onClick={onExit}
          className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer"
          title="Close Camera"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* =========================================================
          3. LIVE QUESTION CARD (ONLY VISIBLE DURING RECORDING)
          Questions stay hidden before recording starts so users stay focused.
          ========================================================= */}
      <div className="relative z-20 px-3.5 pb-2 flex flex-col items-center justify-end flex-1">
        {recState === 'recording' ? (
          <div className="w-full bg-white rounded-3xl p-4 text-neutral-900 shadow-2xl border border-neutral-100 transition-all transform animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* Card Top: Handset Thumbnail + Question Index + Audio Replay */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 p-0.5 shrink-0 flex items-center justify-center">
                  <img
                    src={currentPhone.img}
                    alt={currentPhone.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-1">
                    <span>Question ({currentQuestionIdx + 1} of {questions.length})</span>
                  </div>
                  <div className="text-xs font-bold text-neutral-800 truncate">
                    {currentPhone.name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Audio Replay Button */}
                <button
                  type="button"
                  onClick={() => {
                    const textToReplay = currentQuestionIdx === 0
                      ? currentQ.voiceText(formalGreeting, currentPhone.name)
                      : currentQ.voiceText('', currentPhone.name);
                    speakText(textToReplay);
                  }}
                  className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                    isAiSpeaking
                      ? 'bg-blue-50 border-blue-300 text-blue-600 animate-pulse'
                      : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-600'
                  }`}
                  title="Hear Question Audio Again"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                {/* Instant Stop & Preview/Submit Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (Object.keys(latestAnswersRef.current).length === 0 && !userAnswers[currentQuestionIdx]) {
                      setAnswerRequiredNotice(true);
                      playAudioEffect('click');
                      return;
                    }
                    finishRecordingSession();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Finish recording and preview video & answers"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Submit</span>
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="my-2.5 text-left">
              <h4 className="font-extrabold text-sm sm:text-base text-neutral-900 leading-snug">
                {currentQ.title.replace(/फोनको/g, `${currentPhone.name} को`).replace(/फोन/g, currentPhone.name).replace(/Phone/gi, currentPhone.name)}
              </h4>
            </div>

            {/* 4 Simple Tap-to-Select MCQ Answer Options (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-2">
              {currentQ.options.map((opt, optIdx) => {
                const letter = ['A', 'B', 'C', 'D'][optIdx] || `${optIdx + 1}`;
                const isSelected = userAnswers[currentQuestionIdx] === opt;
                const isPulsing = animatingOptionIdx === optIdx;

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(opt, optIdx)}
                    className={`py-2 px-2.5 rounded-xl text-left border transition-all duration-150 transform active:scale-95 cursor-pointer flex items-center gap-1.5 min-h-[44px] ${
                      isPulsing || isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                        : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] shrink-0 ${
                      isPulsing || isSelected
                        ? 'bg-white text-blue-600'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}>
                      {isSelected ? '✓' : letter}
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {answerRequiredNotice && !userAnswers[currentQuestionIdx] && (
              <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Please choose an answer (A–D) before going to the next question.</span>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-100 text-xs">
              <button
                type="button"
                disabled={currentQuestionIdx === 0}
                onClick={() => {
                  if (currentQuestionIdx > 0) {
                    const prevIdx = currentQuestionIdx - 1;
                    setAnswerRequiredNotice(false);
                    setCurrentQuestionIdx(prevIdx);
                    speakText(questions[prevIdx].voiceText('', currentPhone.name));
                  }
                }}
                className="text-neutral-500 hover:text-neutral-900 disabled:opacity-20 font-bold text-xs cursor-pointer"
              >
                ← Prev
              </button>
              <span className="text-[11px] font-semibold text-neutral-500">
                {Object.keys(userAnswers).length} / {questions.length} answered
              </span>
              <button
                type="button"
                aria-disabled={!userAnswers[currentQuestionIdx]}
                onClick={() => {
                  if (!userAnswers[currentQuestionIdx]) {
                    setAnswerRequiredNotice(true);
                    playAudioEffect('click');
                    return;
                  }
                  setAnswerRequiredNotice(false);
                  if (currentQuestionIdx >= questions.length - 1) {
                    finishRecordingSession();
                  } else {
                    const nextIdx = currentQuestionIdx + 1;
                    setCurrentQuestionIdx(nextIdx);
                    speakText(questions[nextIdx].voiceText('', currentPhone.name));
                  }
                }}
                className={`font-extrabold text-xs transition-colors ${
                  userAnswers[currentQuestionIdx]
                    ? 'text-blue-600 hover:text-blue-700 cursor-pointer'
                    : 'text-neutral-300 cursor-not-allowed'
                }`}
                title={
                  userAnswers[currentQuestionIdx]
                    ? 'Go to next question'
                    : 'Choose an answer first to continue'
                }
              >
                {currentQuestionIdx >= questions.length - 1 ? 'Finish & Submit' : 'Next →'}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xs mb-2 px-4 py-3 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 text-center shadow-lg">
            <div className="text-xs font-bold text-white">
              {currentPhone.name} · Video Campaign
            </div>
            <div className="text-[11px] text-white/75 mt-1 leading-snug">
              Tap the red record button to start. Live questions appear automatically during recording.
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          4. ULTRA-CLEAN BOTTOM ACTION BAR
          Only 3 Essential Buttons: [🔄 Flip] [🔴 Record] [🌐 Language]
          ========================================================= */}
      <footer className="relative z-20 pb-6 pt-2 px-8 flex items-center justify-between">
        {/* Left: Camera Flip (🔄) */}
        <button
          type="button"
          onClick={flipCamera}
          className="w-13 h-13 rounded-full bg-black/45 hover:bg-black/60 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white transition-all active:scale-90 cursor-pointer shadow-lg"
          title="Flip Camera"
        >
          <RefreshCw className="w-5 h-5 text-white/95" />
          <span className="text-[9px] font-bold text-white/80 mt-0.5">Flip</span>
        </button>

        {/* Center: BIG RED RECORD BUTTON (🔴) */}
        <div className="relative flex items-center justify-center">
          {/* Subtle Outer Glow Ring when recording */}
          {recState === 'recording' && (
            <div className="absolute w-22 h-22 rounded-full border-2 border-rose-500 animate-ping pointer-events-none opacity-40" />
          )}

          <button
            type="button"
            onClick={toggleRecord}
            className={`w-19 h-19 rounded-full border-4 border-white flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shadow-[0_0_30px_rgba(244,63,94,0.5)] ${
              recState === 'recording' ? 'bg-black/60' : 'bg-transparent'
            }`}
            title={recState === 'recording' ? 'Stop Recording' : 'Start Recording'}
          >
            {/* Center Core: Circle transforms into Rounded Square when recording */}
            <div
              className={`bg-rose-500 transition-all duration-300 ${
                recState === 'recording'
                  ? 'w-7 h-7 rounded-lg'
                  : 'w-14 h-14 rounded-full hover:scale-105 shadow-inner'
              }`}
            />
          </button>
        </div>

        {/* Right: Dynamic Language Switcher (🌐) */}
        <button
          type="button"
          onClick={cycleLanguage}
          className="w-13 h-13 rounded-full bg-black/45 hover:bg-black/60 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white transition-all active:scale-90 cursor-pointer shadow-lg"
          title="Switch Language (English / Nepali / Hindi / Spanish)"
        >
          <Languages className="w-5 h-5 text-amber-300" />
          <span className="text-[9px] font-black text-amber-300 mt-0.5">{getLanguageLabel()}</span>
        </button>
      </footer>

      {/* =========================================================
          FAST 1-TAP TERMS & PRIVACY CONSENT MODAL
          ========================================================= */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 text-neutral-900 shadow-2xl flex flex-col gap-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Camera & Verification Consent</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-600 space-y-2 leading-relaxed">
              <p>
                ✓ <b>Face View Only:</b> Video recording is strictly used to verify real user experience for <b>{currentPhone.name}</b>.
              </p>
              <p>
                ✓ <b>Zero File Access:</b> We never access your personal files, contacts, or storage.
              </p>
              <p>
                ✓ <b>Instant Reward:</b> Review completion automatically enters verification for creator payout.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onToggleTerms(true);
                setShowTermsModal(false);
                playAudioEffect('chime');
                // Automatically begin recording immediately on consent
                beginRecordingSession();
              }}
              className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Agree & Start Recording</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

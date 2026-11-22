import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldCheck, Volume2, Square, Bot, Loader2, VolumeX, Sparkles, Settings2 } from 'lucide-react';
import { FeedbackItem } from '../types';
import { phoneById } from '../data/initialData';

interface DirectChatModalProps {
  feedback: FeedbackItem | null;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'company' | 'reviewer';
  text: string;
  time: string;
  isAi?: boolean;
}

export type VoiceProfileId = 'friendly' | 'professional' | 'energetic';

export interface VoiceProfileConfig {
  id: VoiceProfileId;
  label: string;
  icon: string;
  desc: string;
  rate: number;
  pitch: number;
  preferredVoices: string[];
}

export const VOICE_PROFILES: VoiceProfileConfig[] = [
  {
    id: 'friendly',
    label: 'Friendly',
    icon: '😊',
    desc: 'Warm, natural & conversational tone',
    rate: 1.0,
    pitch: 1.08,
    preferredVoices: ['Samantha', 'Victoria', 'Google US English', 'Natural', 'en-US'],
  },
  {
    id: 'professional',
    label: 'Professional',
    icon: '💼',
    desc: 'Calm, formal & measured articulation',
    rate: 0.94,
    pitch: 0.90,
    preferredVoices: ['Daniel', 'Oliver', 'George', 'David', 'Google UK English Male', 'en-GB', 'en-US'],
  },
  {
    id: 'energetic',
    label: 'Energetic',
    icon: '⚡',
    desc: 'Upbeat, enthusiastic & lively tempo',
    rate: 1.18,
    pitch: 1.25,
    preferredVoices: ['Karen', 'Tessa', 'Moira', 'Zira', 'Google UK English Female', 'en-AU', 'en-US'],
  },
];

export const DirectChatModal: React.FC<DirectChatModalProps> = ({ feedback, onClose }) => {
  const phone = feedback ? phoneById(feedback.phone) : null;
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      sender: 'reviewer',
      text: `Hi! I posted my 1-minute video review on "${phone?.name || 'your device'}". Feel free to ask me anything about the real-world battery life, camera focus, or comfort!`,
      time: '10 mins ago',
      isAi: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfileId>('friendly');
  const [speechWarning, setSpeechWarning] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Load and cache browser Web Speech API voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Clean up Web Speech API synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!feedback || !phone) return null;

  // Save selected voice profile
  const handleSelectProfile = (profileId: VoiceProfileId) => {
    setVoiceProfile(profileId);
  };

  // Web Speech API: Text-to-Speech handler customized by the active Voice Profile
  const speakMessage = (text: string, msgIndex: number, overrideProfile?: VoiceProfileId) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechWarning('Web Speech API is not supported in this browser.');
      return;
    }
    setSpeechWarning(null);

    // Toggle off if currently speaking this exact message
    if (speakingIndex === msgIndex && (window.speechSynthesis.speaking || isSpeaking)) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      setIsSpeaking(false);
      return;
    }

    // Cancel any previous speech
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Find profile settings (rate & pitch)
    const activeProfId = overrideProfile || voiceProfile;
    const profileConfig = VOICE_PROFILES.find((p) => p.id === activeProfId) || VOICE_PROFILES[0];

    // Strip markdown formatting for natural voice output
    const cleanText = text.replace(/[*_#`~]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = profileConfig.rate;
    utterance.pitch = profileConfig.pitch;

    // Pick best matching voice for this specific profile
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      let matchedVoice: SpeechSynthesisVoice | undefined;
      for (const keyword of profileConfig.preferredVoices) {
        matchedVoice = voices.find(
          (v) => (v.name.includes(keyword) || v.lang.includes(keyword)) && v.lang.startsWith('en')
        );
        if (matchedVoice) break;
      }
      if (!matchedVoice) {
        matchedVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') || v.name.includes('Google') || v.default)
        ) || voices.find((v) => v.lang.startsWith('en'));
      }
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onstart = () => {
      setSpeakingIndex(msgIndex);
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setSpeakingIndex(null);
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeakingIndex(null);
      setIsSpeaking(false);
    };

    // Keep reference on window to prevent Chrome GC bug
    (window as unknown as { _directChatUtterance?: SpeechSynthesisUtterance })._directChatUtterance = utterance;

    window.speechSynthesis.speak(utterance);
  };

  // Preview / Sample audio for the active voice profile
  const previewCurrentVoice = (profileId: VoiceProfileId = voiceProfile) => {
    const config = VOICE_PROFILES.find((p) => p.id === profileId) || VOICE_PROFILES[0];
    const previewText = `Hello! I am using the ${config.label} voice profile with ${config.desc}.`;
    speakMessage(previewText, -99, profileId);
  };

  // Stop all active speech
  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
    setIsSpeaking(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'company',
      text: userText,
      time: 'Just now',
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    try {
      const lower = userText.toLowerCase();
      let replyText = '';
      if (lower.includes('issue') || lower.includes('bug') || lower.includes('problem') || lower.includes('dislike') || lower.includes('fix')) {
        replyText = feedback.dislike
          ? `On my ${phone.name}, the main issue I noted was: "${feedback.dislike}". Addressing "${feedback.improve || 'that behavior'}" would make a big difference.`
          : `I did not encounter major bugs on my ${phone.name}, though improving "${feedback.improve || 'overall polish'}" would help.`;
      } else if (lower.includes('comfort') || lower.includes('hold') || lower.includes('weight') || lower.includes('grip')) {
        replyText = feedback.comfort
          ? `Regarding ergonomics on ${phone.name}: "${feedback.comfort}".`
          : `The ${phone.name} feels steady for daily handling in ${feedback.city}.`;
      } else if (lower.includes('like') || lower.includes('best') || lower.includes('love') || lower.includes('camera') || lower.includes('battery')) {
        replyText = feedback.like
          ? `What stood out most on ${phone.name} was: "${feedback.like}" (rated ${feedback.rating}/5).`
          : `I rated the ${phone.name} ${feedback.rating}/5 overall.`;
      } else {
        replyText = `Thanks for reaching out about my ${phone.name} review (${feedback.rating}/5 stars). What I liked most: "${feedback.like || 'solid daily experience'}". Main area to improve: "${feedback.improve || feedback.dislike || 'minor refinements'}".`;
      }

      await new Promise((r) => setTimeout(r, 150));

      const replyMsgId = `msg-${Date.now()}-ai`;
      const aiReply: ChatMessage = {
        id: replyMsgId,
        sender: 'reviewer',
        text: replyText,
        time: 'Just now',
        isAi: true,
      };

      setMessages((prev) => {
        const next = [...prev, aiReply];
        const newIdx = next.length - 1;
        if (autoSpeak) {
          setTimeout(() => {
            speakMessage(replyText, newIdx);
          }, 350);
        }
        return next;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    stopSpeech();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full h-[560px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {feedback.userAvatar ? (
              <img
                src={feedback.userAvatar}
                alt={feedback.user}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white font-bold flex items-center justify-center">
                {feedback.user.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-slate-900">{feedback.user}</h3>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                  <Bot className="w-2.5 h-2.5" />
                  AI Voice Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Verified Reviewer • {phone.name} ({feedback.city})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Speak Toggle */}
            <button
              type="button"
              onClick={() => {
                if (autoSpeak) stopSpeech();
                setAutoSpeak(!autoSpeak);
              }}
              title={autoSpeak ? 'Disable automatic voice playback' : 'Enable automatic voice playback for AI responses'}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-all ${
                autoSpeak
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
              }`}
            >
              <Volume2 className={`w-3 h-3 ${autoSpeak ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Auto-Read: {autoSpeak ? 'On' : 'Off'}</span>
            </button>

            {/* Global Stop button when actively speaking */}
            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeech}
                title="Stop speaking"
                className="p-1.5 rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 transition-all border border-rose-300"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            )}

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voice Profile Settings Toolbar */}
        <div className="px-3.5 py-2 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-extrabold shrink-0">
            <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">AI Voice Profile:</span>
            <span className="sm:hidden">Voice:</span>
          </div>

          <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200/90 shadow-2xs">
            {VOICE_PROFILES.map((prof) => {
              const isSelected = voiceProfile === prof.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => handleSelectProfile(prof.id)}
                  title={`${prof.label}: ${prof.desc} (Pitch: ${prof.pitch}, Speed: ${prof.rate}x)`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{prof.icon}</span>
                  <span>{prof.label}</span>
                </button>
              );
            })}
          </div>

          {/* Hear Sample Button */}
          <button
            type="button"
            onClick={() => previewCurrentVoice()}
            title="Hear an audio sample of the selected Web Speech voice profile"
            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
          >
            <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sample</span>
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-white to-slate-50/60">
          <div className="text-center my-1">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-slate-200/70 text-slate-600 px-2.5 py-0.5 rounded-full">
              Direct Verified Channel • Web Speech ({VOICE_PROFILES.find((p) => p.id === voiceProfile)?.label} Mode) 🔊
            </span>
          </div>
          {speechWarning && (
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold text-center">
              {speechWarning}
            </div>
          )}

          {messages.map((m, idx) => {
            const isCompany = m.sender === 'company';
            const isThisSpeaking = speakingIndex === idx;

            return (
              <div
                key={m.id || idx}
                className={`flex flex-col ${isCompany ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium leading-relaxed transition-all shadow-2xs ${
                    isCompany
                      ? 'bg-slate-900 text-white rounded-br-xs'
                      : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                  } ${isThisSpeaking ? 'ring-2 ring-indigo-500/50 shadow-md' : ''}`}
                >
                  <p>{m.text}</p>

                  {/* Web Speech API Listen Trigger for Reviewer / AI Chatbot Responses */}
                  {!isCompany && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => speakMessage(m.text, idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 ${
                          isThisSpeaking
                            ? 'bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-400/40 animate-pulse'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                        title={isThisSpeaking ? 'Stop text-to-speech audio' : 'Listen to this response using Web Speech API'}
                      >
                        {isThisSpeaking ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>

                      {isThisSpeaking ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          <span>Reading aloud ({voiceProfile})...</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span className="capitalize">{voiceProfile} voice</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.time}</span>
              </div>
            );
          })}

          {/* AI Generation Loading Indicator */}
          {isGenerating && (
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-2xl w-fit">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Reviewer AI is replying...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${feedback.user} about their ${phone.name} review...`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-all shadow-xs flex items-center justify-center"
            title="Send Message"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

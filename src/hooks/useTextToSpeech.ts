import { useCallback, useRef, useEffect } from "react";
import { getVoice } from "@/lib/voiceStore";

export function useTextToSpeech() {
  const lastSpokenRef = useRef<string>("");
  const lastTimeRef = useRef<number>(0);
  const warmedUpRef = useRef(false);
  const playingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Warm up speech synthesis on first user interaction
  useEffect(() => {
    const warmUp = () => {
      if (warmedUpRef.current) return;
      warmedUpRef.current = true;
      const utterance = new SpeechSynthesisUtterance("");
      utterance.volume = 0;
      window.speechSynthesis?.speak(utterance);
    };

    document.addEventListener("click", warmUp, { once: true });
    document.addEventListener("keydown", warmUp, { once: true });
    return () => {
      document.removeEventListener("click", warmUp);
      document.removeEventListener("keydown", warmUp);
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    const now = Date.now();
    // Don't repeat same gesture within 2.5 seconds
    if (text === lastSpokenRef.current && now - lastTimeRef.current < 2500) return;

    lastSpokenRef.current = text;
    lastTimeRef.current = now;

    // Stop any playing audio
    if (playingAudioRef.current) {
      playingAudioRef.current.pause();
      playingAudioRef.current = null;
    }

    // Try recorded voice first
    try {
      const voice = await getVoice(text);
      if (voice) {
        const url = URL.createObjectURL(voice.audioBlob);
        const audio = new Audio(url);
        playingAudioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          playingAudioRef.current = null;
        };
        await audio.play();
        return;
      }
    } catch {
      // Fall through to TTS
    }

    // Fallback to TTS
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const englishVoice = voices.find(
          (v) => v.lang.startsWith("en") && v.localService
        );
        if (englishVoice) utterance.voice = englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    }, 50);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (playingAudioRef.current) {
      playingAudioRef.current.pause();
      playingAudioRef.current = null;
    }
  }, []);

  return { speak, stopSpeaking };
}

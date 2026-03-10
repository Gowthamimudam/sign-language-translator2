export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function speakText(text: string, opts: SpeakOptions = {}) {
  if (!text) return;
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = opts.rate ?? 0.9;
  utterance.pitch = opts.pitch ?? 1;
  utterance.volume = opts.volume ?? 1;

  // Prefer an English local voice when available
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const englishVoice = voices.find((v) => v.lang.startsWith("en") && v.localService);
    if (englishVoice) utterance.voice = englishVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  window.speechSynthesis?.cancel();
}


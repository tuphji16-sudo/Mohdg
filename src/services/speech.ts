// Web Speech and Audio Utility for Arabic Voice

export interface SpeechRecognitionResultHandler {
  onResult: (text: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export class SpeechHelper {
  private static recognition: any = null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static activeAudio: HTMLAudioElement | null = null;

  // Initialize Speech Recognition for Arabic
  public static startListening(callbacks: SpeechRecognitionResultHandler, lang: string = 'ar-SA') {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      callbacks.onError('متصفحك لا يدعم خاصية التعرف على الصوت المباشر.');
      return null;
    }

    try {
      if (this.recognition) {
        this.recognition.stop();
      }

      this.recognition = new SpeechRecognition();
      this.recognition.lang = lang;
      this.recognition.continuous = false;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        callbacks.onResult(transcript);
      };

      this.recognition.onerror = (event: any) => {
        callbacks.onError(event.error || 'حدث خطأ أثناء الاستماع');
      };

      this.recognition.onend = () => {
        callbacks.onEnd();
      };

      this.recognition.start();
      return this.recognition;
    } catch (e: any) {
      callbacks.onError(e.message || 'فشل تشغيل الميكروفون');
      return null;
    }
  }

  public static stopListening() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }

  // Speak Arabic text using browser TTS
  public static speakArabic(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    rate: number = 1.0,
    pitch: number = 1.0
  ) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return false;
    }

    window.speechSynthesis.cancel();

    // Clean markdown symbols for cleaner speech
    const cleanText = text
      .replace(/[*#`_~\[\]()><]/g, ' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-SA';
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Pick best Arabic voice if available
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(
      (v) => v.lang.startsWith('ar') || v.name.includes('Arabic') || v.name.includes('Maged') || v.name.includes('Laila') || v.name.includes('Tarik')
    );
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  public static stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }
  }

  // Play base64 audio
  public static playBase64Audio(
    base64Data: string,
    mimeType: string = 'audio/wav',
    onEnd?: () => void
  ) {
    this.stopSpeaking();
    try {
      const audioUrl = `data:${mimeType};base64,${base64Data}`;
      const audio = new Audio(audioUrl);
      this.activeAudio = audio;

      audio.onended = () => {
        this.activeAudio = null;
        if (onEnd) onEnd();
      };

      audio.onerror = (e) => {
        console.error('Audio playback error', e);
        this.activeAudio = null;
        if (onEnd) onEnd();
      };

      audio.play();
      return audio;
    } catch (err) {
      console.error('Failed to play audio:', err);
      if (onEnd) onEnd();
      return null;
    }
  }
}

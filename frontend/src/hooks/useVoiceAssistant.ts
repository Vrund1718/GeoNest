import { useState, useEffect, useRef, useCallback } from 'react';

export type VoiceLanguage = 'en-IN' | 'hi-IN' | 'gu-IN';

export interface UseVoiceAssistantOptions {
  onSpeechEnd?: (text: string) => void;
  defaultLanguage?: VoiceLanguage;
}

// Global ambient type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) -> link
    .replace(/[*_~`#>-]/g, '') // remove markdown symbols
    .replace(/\n+/g, '. ') // line breaks to pauses
    .trim();
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
  const { onSpeechEnd, defaultLanguage = 'en-IN' } = options;

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<VoiceLanguage>(defaultLanguage);
  const [autoSend, setAutoSend] = useState(true);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onSpeechEndRef = useRef(onSpeechEnd);

  useEffect(() => {
    onSpeechEndRef.current = onSpeechEnd;
  }, [onSpeechEnd]);

  const isSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingTts(false);
      setActiveSpeakingId(null);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore if already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    stopSpeaking(); // stop TTS if currently playing

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;

      let finalResult = '';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalResult += result[0].transcript;
          } else {
            currentInterim += result[0].transcript;
          }
        }
        setInterimTranscript(currentInterim);
        if (finalResult) {
          setTranscript(finalResult);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[SpeechRecognition Error]', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone access in browser settings.');
        } else if (event.error === 'no-speech') {
          setError('No speech was detected. Please try again.');
        } else if (event.error !== 'aborted') {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        const trimmed = (finalResult || transcript).trim();
        if (trimmed && onSpeechEndRef.current) {
          onSpeechEndRef.current(trimmed);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('[SpeechRecognition Start Exception]', err);
      setError('Failed to start microphone. Please try again.');
      setIsListening(false);
    }
  }, [selectedLanguage, stopSpeaking, transcript]);

  const speak = useCallback(
    (text: string, messageId?: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      stopSpeaking();
      stopListening();

      const cleanText = stripMarkdown(text);
      if (!cleanText) return;

      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to match voice for target language
        const voices = window.speechSynthesis.getVoices();
        const targetLangCode = selectedLanguage.split('-')[0]; // 'en', 'hi', 'gu'
        const matchingVoice = voices.find(
          (v) => v.lang.toLowerCase().startsWith(targetLangCode) || v.lang.toLowerCase().includes(selectedLanguage.toLowerCase())
        );

        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
        utterance.lang = selectedLanguage;

        utterance.onstart = () => {
          setIsPlayingTts(true);
          if (messageId) setActiveSpeakingId(messageId);
        };

        utterance.onend = () => {
          setIsPlayingTts(false);
          setActiveSpeakingId(null);
        };

        utterance.onerror = (e) => {
          console.warn('[SpeechSynthesis Error]', e);
          setIsPlayingTts(false);
          setActiveSpeakingId(null);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('[SpeechSynthesis Exception]', err);
        setIsPlayingTts(false);
        setActiveSpeakingId(null);
      }
    },
    [selectedLanguage, stopListening, stopSpeaking]
  );

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, [stopListening, stopSpeaking]);

  return {
    isSupported,
    isListening,
    interimTranscript,
    transcript,
    error,
    selectedLanguage,
    setSelectedLanguage,
    autoSend,
    setAutoSend,
    voiceReplies,
    setVoiceReplies,
    isPlayingTts,
    activeSpeakingId,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearError: () => setError(null),
  };
}

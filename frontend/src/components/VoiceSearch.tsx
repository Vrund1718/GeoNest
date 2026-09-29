import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Sparkles, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { SearchFilters } from '../types';

interface VoiceSearchProps {
  onFiltersParsed: (filters: Partial<SearchFilters>) => void;
  onRawText: (text: string) => void;
}

export const VoiceSearch: React.FC<VoiceSearchProps> = ({ onFiltersParsed, onRawText }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-IN';

    rec.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    rec.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access was denied. Please check browser permissions.');
      } else if (event.error !== 'no-speech') {
        toast.error('Voice input error. Try speaking again or type your search.');
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    setRecognition(rec);
  }, []);

  const startListening = () => {
    if (!isSupported || !recognition) {
      toast.error('Voice search is not supported in this browser.');
      return;
    }

    try {
      setTranscript('');
      setIsListening(true);
      setShowPreviewModal(true);
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const handleApplyVoiceSearch = async () => {
    const textToParse = transcript.trim();
    if (!textToParse) {
      toast.error('No voice input detected.');
      return;
    }

    stopListening();
    setParsing(true);
    onRawText(textToParse);

    try {
      const { data } = await api.post('/ai/parse-search', { text: textToParse });
      if (data.ok && data.filters) {
        onFiltersParsed(data.filters);
        toast.success(
          data.aiAvailable
            ? 'AI parsed your voice query into filters!'
            : 'Voice query applied to search!'
        );
      } else {
        onFiltersParsed({ query: textToParse });
      }
    } catch (err) {
      console.error(err);
      onFiltersParsed({ query: textToParse });
    } finally {
      setParsing(false);
      setShowPreviewModal(false);
    }
  };

  if (!isSupported) {
    return null; // Gracefully hide button if unsupported
  }

  return (
    <>
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        className={`relative p-2.5 rounded-xl transition-all flex items-center justify-center min-w-[44px] min-h-[44px] ${
          isListening
            ? 'bg-rose-500 text-white animate-pulse shadow-lg ring-4 ring-rose-300 dark:ring-rose-900'
            : 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-slate-600'
        }`}
        title={isListening ? 'Listening... click to stop' : 'Voice Search with AI'}
        aria-label="Voice Search"
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Voice Transcript Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="card w-full max-w-md bg-white dark:bg-slate-800 border dark:border-slate-700 p-6 shadow-2xl rounded-3xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Voice Search
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setShowPreviewModal(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Listening Indicator */}
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div
                className={`w-16 h-16 rounded-full grid place-items-center mb-3 transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-ping'
                    : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                <Mic className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isListening ? 'Listening to your voice...' : 'Transcript ready'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                e.g. "Looking for girls PG near Nirma University under 10000 with Wi-Fi"
              </p>
            </div>

            {/* Editable Transcript Field */}
            <div className="mb-4">
              <label className="label">Your Spoken Query:</label>
              <textarea
                className="input min-h-[80px] py-2"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Say something or type here..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setShowPreviewModal(false);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyVoiceSearch}
                disabled={parsing || !transcript.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                {parsing ? (
                  <span>AI Parsing...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

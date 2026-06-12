import React, { useEffect, useRef, useState } from 'react';
import { speechAvailable, listenOnce } from '../utils/speech';
import { parseVoiceAlternatives } from '../utils/voiceMoves';

// 🎤 Say your move — "knight takes d6", "castle queenside", "e4".
// Self-hiding when the platform has no speech recognition. Feedback goes
// through the host's existing feedback area via onFeedback({kind, text}):
//   kind 'voice'      — neutral status (listening / live transcript)
//   kind 'voice-miss' — teach-and-retry message (didn't parse / mic issue)
// A successful parse clears feedback and calls onMove(from, to, promotion).
export default function VoiceButton({ fen, disabled, onMove, onFeedback }) {
  const [listening, setListening] = useState(false);
  const stopRef = useRef(null);
  const fenRef = useRef(fen);
  fenRef.current = fen; // parse against the position at RESULT time, not tap time

  useEffect(() => () => stopRef.current && stopRef.current(), []);

  if (!speechAvailable()) return null;

  function toggle() {
    if (listening) {
      stopRef.current && stopRef.current();
      setListening(false);
      onFeedback && onFeedback(null);
      return;
    }
    setListening(true);
    onFeedback && onFeedback({ kind: 'voice', text: '🎤 Listening… say your move ("knight to f3")' });
    stopRef.current = listenOnce({
      onPartial: (t) => onFeedback && onFeedback({ kind: 'voice', text: `🎤 “${t.trim()}”` }),
      onResult: (alts) => {
        const res = parseVoiceAlternatives(alts, fenRef.current);
        if (res.status === 'ok') {
          onFeedback && onFeedback(null);
          onMove(res.move.from, res.move.to, res.move.promotion);
        } else {
          onFeedback && onFeedback({ kind: 'voice-miss', text: `🎤 ${res.message}` });
        }
      },
      onError: (code) => {
        if (code === 'aborted') return; // user tapped to cancel
        const text =
          code === 'not-allowed' || code === 'service-not-allowed'
            ? '🎤 Microphone is blocked — allow it in your browser settings.'
            : code === 'no-speech'
            ? "🎤 I didn't hear anything — tap and try again!"
            : code === 'network'
            ? '🎤 Voice needs an internet connection.'
            : "🎤 I didn't catch that — tap and try again!";
        onFeedback && onFeedback({ kind: 'voice-miss', text });
      },
      onEnd: () => setListening(false),
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      className={`cc-btn px-3 py-2 text-sm shrink-0 ${listening ? 'cc-btn-primary animate-pulse' : 'cc-btn-secondary'}`}
      title={listening ? 'Stop listening' : 'Say your move'}
      aria-label={listening ? 'Stop listening' : 'Say your move'}
    >
      🎤
    </button>
  );
}

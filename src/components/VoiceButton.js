import React, { useEffect, useRef, useState } from 'react';
import { speechAvailable, listenOnce, listenContinuous } from '../utils/speech';
import { parseVoiceAlternatives } from '../utils/voiceMoves';

// 🎤 Say your move — "knight takes d6", "castle queenside", "e4".
//
// Two modes:
//  - one-shot (default): tap, speak one move, mic closes. Used in Drill,
//    where lesson cards interleave with her moves.
//  - continuous: tap once for HANDS-FREE — the mic stays open for the whole
//    game. Moves only apply on her turn (canMove); anything heard during the
//    opponent's turn is ignored, so table talk can't move pieces. Voice
//    commands work any time: "undo" / "take back", "hint", and "mic off" /
//    "stop listening" — so she can pause it without touching the screen.
//    Tapping the (pulsing) button also turns it off.
//
// Feedback flows through the host's feedback area via onFeedback({kind,text}):
// kind 'voice' = neutral status, 'voice-miss' = teach-and-retry. Self-hiding
// when the platform has no speech recognition.

const CMD_OFF = /\b(mic off|microphone off|stop listening|stop the mic|turn off the mic)\b/;
const CMD_UNDO = /\b(undo|take back|takeback|take that back|go back)\b/;
const CMD_HINT = /\b(hint|help me)\b/;
const CMD_NEW = /\b(new game|start (a )?new game|play again|restart( the)? game)\b/;

export default function VoiceButton({ fen, canMove = true, disabled = false, continuous = false, small = false, onMove, onCommand, onFeedback }) {
  const [on, setOn] = useState(false);
  const stopRef = useRef(null);
  // Latest-value refs: results arrive long after the tap that started
  // listening, so every callback reads through refs — never stale closures.
  const fenRef = useRef(fen);
  fenRef.current = fen;
  const canMoveRef = useRef(canMove);
  canMoveRef.current = canMove;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const onFeedbackRef = useRef(onFeedback);
  onFeedbackRef.current = onFeedback;

  useEffect(() => () => stopRef.current && stopRef.current(), []);

  if (!speechAvailable()) return null;

  const feedback = (msg) => onFeedbackRef.current && onFeedbackRef.current(msg);

  function stopMic(message) {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    setOn(false);
    feedback(message === undefined ? null : message);
  }

  function handleFinal(alts) {
    const said = ((alts && alts[0]) || '').toLowerCase();
    if (continuous && CMD_OFF.test(said)) {
      stopMic({ kind: 'voice', text: '🎤 Mic off — tap 🎤 when you want it back.' });
      return;
    }
    if (onCommandRef.current && CMD_UNDO.test(said)) {
      onCommandRef.current('undo');
      feedback({ kind: 'voice', text: '🎤 Took that back — your move!' });
      return;
    }
    if (onCommandRef.current && CMD_HINT.test(said)) {
      onCommandRef.current('hint');
      return;
    }
    if (onCommandRef.current && CMD_NEW.test(said)) {
      // Feedback first — the host may follow with its own ("You're playing White!").
      feedback({ kind: 'voice', text: '🎤 New game — here we go!' });
      onCommandRef.current('new');
      return;
    }
    if (!canMoveRef.current) return; // opponent's turn — ignore table talk
    const res = parseVoiceAlternatives(alts, fenRef.current);
    if (res.status === 'ok') {
      feedback(null);
      onMoveRef.current(res.move.from, res.move.to, res.move.promotion);
    } else {
      feedback({ kind: 'voice-miss', text: `🎤 ${res.message}` });
    }
  }

  function errorText(code) {
    if (code === 'not-allowed' || code === 'service-not-allowed')
      return '🎤 Microphone is blocked — allow it in your browser settings.';
    if (code === 'no-speech') return "🎤 I didn't hear anything — tap and try again!";
    if (code === 'network') return '🎤 Voice needs an internet connection.';
    return "🎤 I didn't catch that — tap and try again!";
  }

  function toggle() {
    if (on) {
      stopMic({ kind: 'voice', text: '🎤 Mic off — tap 🎤 when you want it back.' });
      return;
    }
    setOn(true);
    feedback({
      kind: 'voice',
      text: continuous
        ? '🎤 Hands-free on! Say your moves — "undo" and "mic off" work too.'
        : '🎤 Listening… say your move ("knight to f3")',
    });
    const listen = continuous ? listenContinuous : listenOnce;
    stopRef.current = listen({
      onPartial: (t) => feedback({ kind: 'voice', text: `🎤 “${t.trim()}”` }),
      onResult: handleFinal,
      onError: (code) => {
        if (code === 'aborted') return; // user tapped to cancel
        feedback({ kind: 'voice-miss', text: errorText(code) });
      },
      onEnd: () => setOn(false),
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      className={`cc-btn shrink-0 ${small ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'} ${
        on ? 'cc-btn-primary animate-pulse' : 'cc-btn-secondary'
      }`}
      title={on ? 'Mic is on — tap to turn off' : continuous ? 'Hands-free: say your moves' : 'Say your move'}
      aria-label={on ? 'Turn the microphone off' : 'Say your move'}
    >
      🎤
    </button>
  );
}

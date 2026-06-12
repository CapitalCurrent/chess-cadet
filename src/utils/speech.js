// Speech capture behind a capability check. On the web this is the browser's
// SpeechRecognition (Chrome/Edge desktop+Android, Safari/iOS 14.5+; Chrome
// recognizes server-side so it needs internet + a secure context). When the
// app is wrapped natively (Capacitor for Android/iOS/Fire), a plugin
// implementation slots in behind THIS SAME interface — callers never change.
// Fire OS has no system recognizer; speechAvailable() returning false there
// simply hides the mic (the keypad/board always work).

function getSR() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function speechAvailable() {
  return !!getSR();
}

// One-shot listen for a single utterance.
//   onPartial(text)          — live interim transcript (UI feedback)
//   onResult(alternatives[]) — final n-best transcripts, called once
//   onError(code)            — 'unavailable' | 'not-allowed' | 'no-speech' | …
//   onEnd()                  — recognition session closed (always fires last)
// Returns a stop() function (aborts listening).
export function listenOnce({ onPartial, onResult, onError, onEnd } = {}) {
  const SR = getSR();
  if (!SR) {
    onError && onError('unavailable');
    onEnd && onEnd();
    return () => {};
  }
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.maxAlternatives = 4;
  rec.continuous = false;

  let resultSent = false;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal && !resultSent) {
        resultSent = true;
        const alts = [];
        for (let j = 0; j < r.length; j++) alts.push(r[j].transcript);
        onResult && onResult(alts);
      } else if (!r.isFinal) {
        interim += r[0].transcript;
      }
    }
    if (interim && !resultSent && onPartial) onPartial(interim);
  };
  rec.onerror = (e) => {
    onError && onError((e && e.error) || 'error');
  };
  rec.onend = () => {
    onEnd && onEnd();
  };
  try {
    rec.start();
  } catch {
    onError && onError('start-failed');
    onEnd && onEnd();
  }
  return () => {
    try {
      rec.abort();
    } catch {
      /* ignore */
    }
  };
}

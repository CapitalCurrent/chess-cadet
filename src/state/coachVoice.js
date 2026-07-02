// Coach voice — the REGISTER of coach messages, never the chess content.
// 'standard' reads naturally for any learner (teen/adult included); 'kid'
// is the warmer, playful register for young players. The advice itself is
// identical in both — this only swaps phrasing (see engine/principles.js).
const KEY = 'chess-cadet-coachvoice';

export function getCoachVoice() {
  return localStorage.getItem(KEY) === 'kid' ? 'kid' : 'standard';
}

export function setCoachVoice(v) {
  localStorage.setItem(KEY, v === 'kid' ? 'kid' : 'standard');
}

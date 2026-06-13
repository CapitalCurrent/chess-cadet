// Chess Power — a friendly Elo rating that lets her watch herself grow, and
// drives the "better match" difficulty suggestion so games stay ~even.
//
// Standard Elo: after a rated game, rating += K * (result - expected), where
// expected = 1 / (1 + 10^((oppElo - rating)/400)). A PROVISIONAL period (big K
// for the first few games) lets the number find her real level fast, then
// settles so it's stable. Only real engine games count (not pass-and-play,
// not abandoned 2-move games). Per profile, localStorage.

const BASE = 'chess-cadet-rating';
const START = 400; // gentle anchor for a young beginner who knows the rules
const FLOOR = 100;
const PROVISIONAL_GAMES = 10;
const K_PROVISIONAL = 48; // converges quickly while we learn her level
const K_STABLE = 24;

export function ratingKey(profileId) {
  return profileId ? `${BASE}::${profileId}` : BASE;
}

function read(profileId) {
  try {
    const d = JSON.parse(localStorage.getItem(ratingKey(profileId)));
    if (d && typeof d.rating === 'number') return { history: [], lastDelta: 0, ...d };
  } catch {
    /* fresh */
  }
  return { rating: START, games: 0, lastDelta: 0, history: [] };
}

function write(profileId, d) {
  try {
    localStorage.setItem(ratingKey(profileId), JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function getRating(profileId) {
  const d = read(profileId);
  return { rating: d.rating, games: d.games, lastDelta: d.lastDelta, provisional: d.games < PROVISIONAL_GAMES };
}

// result: 1 win | 0.5 draw | 0 loss. oppElo = opponent's effective Elo.
// Returns { rating, delta, oppElo, expected, games } for the end-of-game card.
export function recordRatedGame(profileId, oppElo, result) {
  const d = read(profileId);
  const expected = 1 / (1 + Math.pow(10, (oppElo - d.rating) / 400));
  const k = d.games < PROVISIONAL_GAMES ? K_PROVISIONAL : K_STABLE;
  const delta = Math.round(k * (result - expected));
  const rating = Math.max(FLOOR, d.rating + delta);
  const games = d.games + 1;
  const history = [...d.history, { oppElo, result, delta, rating }].slice(-30);
  write(profileId, { rating, games, lastDelta: delta, history });
  return { rating, delta, oppElo, expected, games };
}

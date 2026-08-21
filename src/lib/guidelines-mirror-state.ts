/**
 * The mirror's completeness gate, kept free of any database import so it can
 * be reasoned about — and tested — on its own.
 *
 * This is the safety-critical half of the guidelines mirror. Saying "usable"
 * about a mirror that is short means /guidelines serves a corpus with holes,
 * and a reader searching for one of the missing documents is told it does not
 * exist. That is worse than the slow upstream path the mirror replaces,
 * because it is silent.
 */

export interface MirrorState {
  mirroredCount: number;
  upstreamTotal: number | null;
  lastSyncAt: Date | null;
}

// Below this share of the upstream total the mirror is treated as incomplete
// and ignored. Not 100%: documents removed upstream between syncs would
// otherwise flap the mirror out of use for a day at a time.
export const MIN_COMPLETE_RATIO = 0.98;

/** True when the mirror holds enough of the corpus to be worth serving. */
export function isMirrorUsable(state: MirrorState | null): boolean {
  if (!state || state.mirroredCount === 0) return false;
  if (state.upstreamTotal == null) return true; // never compared; trust the count
  return state.mirroredCount >= state.upstreamTotal * MIN_COMPLETE_RATIO;
}

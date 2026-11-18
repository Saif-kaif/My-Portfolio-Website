import { $, prefersReducedMotion } from './utils.js';

// Verified focus areas only.
const PHRASES = ['CSE Undergraduate', 'Python', 'Java', 'Web Development', 'SQL'];

const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 1800;
const GAP_MS = 350;

/** Terminal-style typing effect in the hero. Static text when motion is reduced. */
export function initHero() {
  const target = $('[data-typed]');
  if (!target) return;

  if (prefersReducedMotion()) {
    target.textContent = PHRASES[0];
    return;
  }

  let phraseIndex = 0;
  let charIndex = PHRASES[0].length; // start with the first phrase fully shown
  let deleting = false;

  const tick = () => {
    const phrase = PHRASES[phraseIndex];

    if (!deleting && charIndex === phrase.length) {
      deleting = true;
      return setTimeout(tick, HOLD_MS);
    }
    if (deleting && charIndex === 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % PHRASES.length;
      return setTimeout(tick, GAP_MS);
    }

    charIndex += deleting ? -1 : 1;
    target.textContent = PHRASES[phraseIndex].slice(0, charIndex);
    return setTimeout(tick, deleting ? DELETE_MS : TYPE_MS);
  };

  setTimeout(tick, 600);
}

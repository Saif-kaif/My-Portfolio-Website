import { $$, prefersReducedMotion } from './utils.js';

let observer = null;

function showAll(elements) {
  elements.forEach((el) => el.classList.add('is-visible'));
}

/** Scroll-triggered reveal using IntersectionObserver. */
export function initReveal() {
  const elements = $$('.reveal');

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    showAll(elements);
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );

  elements.forEach((el) => observer.observe(el));
}

/** Registers elements added after page load (e.g. API-rendered cards). */
export function observeReveal(elements) {
  const list = [].concat(elements);
  if (!observer) {
    showAll(list);
    return;
  }
  list.forEach((el) => observer.observe(el));
}

/** Failsafe used if initialisation throws. */
export function revealEverything() {
  showAll($$('.reveal'));
}

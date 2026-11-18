import { $, $$, prefersReducedMotion } from './utils.js';

function initYear() {
  const year = String(new Date().getFullYear());
  $$('[data-year]').forEach((el) => (el.textContent = year));
}

function initBackToTop() {
  const button = $('[data-back-to-top]');
  if (!button) return;

  const update = () => button.classList.toggle('is-visible', window.scrollY > 640);
  update();
  window.addEventListener('scroll', update, { passive: true });

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    $('.brand')?.focus({ preventScroll: true }); // keep keyboard focus at the top
  });
}

/** Soft glow that follows the cursor — only for fine pointers without reduced motion. */
function initCursorGlow() {
  const glow = $('[data-cursor-glow]');
  if (!glow || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;

  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const current = { ...target };
  let frame = null;

  const step = () => {
    current.x += (target.x - current.x) * 0.15;
    current.y += (target.y - current.y) * 0.15;
    glow.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
    const settled = Math.abs(target.x - current.x) < 0.5 && Math.abs(target.y - current.y) < 0.5;
    frame = settled ? null : requestAnimationFrame(step);
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
      glow.classList.add('is-active');
      frame ??= requestAnimationFrame(step);
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => glow.classList.remove('is-active'));
}

export function initEffects() {
  initYear();
  initBackToTop();
  initCursorGlow();
}

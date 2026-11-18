import { api } from './api.js';
import { $, $$, onFirstVisible, prefersReducedMotion } from './utils.js';

const RING_CIRCUMFERENCE = 2 * Math.PI * 70; // r = 70 in the SVG
const COUNT_DURATION = 1600;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/** Academic overview: profile data, animated CGPA ring and timeline. */
export function initAcademic() {
  const card = $('[data-cgpa-card]');
  const valueEl = $('[data-cgpa-value]');
  const ring = $('[data-cgpa-ring]');
  const scaleEls = $$('[data-cgpa-scale]');

  // Defaults come from the server-rendered HTML (the verified values).
  const state = {
    cgpa: Number.parseFloat(valueEl?.textContent) || 0,
    scale: Number.parseFloat(scaleEls[0]?.textContent) || 4,
    start: Number.parseInt($('[data-year-start]')?.textContent, 10) || 2024,
    end: Number.parseInt($('[data-year-end]')?.textContent, 10) || 2028,
    counted: false,
  };

  const setRing = (fraction) => {
    if (ring) ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - clamp(fraction, 0, 1)));
  };
  const setNumber = (value) => {
    if (valueEl) valueEl.textContent = value.toFixed(2);
  };

  const renderCgpaFinal = () => {
    setNumber(state.cgpa);
    setRing(state.cgpa / state.scale);
    scaleEls.forEach((el) => (el.textContent = state.scale.toFixed(2)));
    card?.setAttribute('aria-label', `Current CGPA: ${state.cgpa.toFixed(2)} out of ${state.scale.toFixed(2)}`);
  };

  const countUp = () => {
    state.counted = true;
    setRing(state.cgpa / state.scale); // CSS transition animates the ring
    const startTime = performance.now();
    const frame = (now) => {
      const progress = clamp((now - startTime) / COUNT_DURATION, 0, 1);
      setNumber(state.cgpa * easeOutCubic(progress));
      if (progress < 1) requestAnimationFrame(frame);
      else renderCgpaFinal();
    };
    requestAnimationFrame(frame);
  };

  const renderTimeline = () => {
    $$('[data-year-start]').forEach((el) => (el.textContent = String(state.start)));
    $$('[data-year-end]').forEach((el) => (el.textContent = String(state.end)));

    const year = new Date().getFullYear();
    const currentStep = $('[data-timeline-current]');
    const currentYear = $('[data-year-current]');
    const inProgress = year >= state.start && year <= state.end;
    if (currentStep) currentStep.hidden = !inProgress;
    if (currentYear) currentYear.textContent = String(year);

    const span = Math.max(state.end - state.start, 1);
    const fraction = clamp((year - state.start) / span, 0, 1);
    const progress = $('[data-timeline-progress]');
    if (progress) progress.style.width = `${fraction * 100}%`;
  };

  // ---------- Initial render ----------
  renderTimeline();
  if (prefersReducedMotion()) {
    renderCgpaFinal();
  } else {
    setNumber(0);
    setRing(0);
    onFirstVisible(card, countUp, { threshold: 0.4 });
  }

  // ---------- Hydrate from the API (falls back silently to HTML values) ----------
  api
    .profile()
    .then(({ data }) => {
      if (!data) return;
      $$('[data-profile-field]').forEach((el) => {
        const value = data[el.dataset.profileField];
        if (typeof value === 'string' && value) el.textContent = value;
      });
      if (Number.isFinite(data.cgpa)) state.cgpa = data.cgpa;
      if (Number.isFinite(data.cgpa_scale) && data.cgpa_scale > 0) state.scale = data.cgpa_scale;
      if (Number.isInteger(data.academic_start_year)) state.start = data.academic_start_year;
      if (Number.isInteger(data.academic_end_year)) state.end = data.academic_end_year;
      renderTimeline();
      if (state.counted || prefersReducedMotion()) renderCgpaFinal();
    })
    .catch(() => {
      /* Static verified content remains visible. */
    });
}

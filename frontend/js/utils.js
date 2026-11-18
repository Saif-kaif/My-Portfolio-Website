/** Shared DOM and environment helpers. */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const prefersReducedMotion = () => reducedMotionQuery.matches;

/**
 * Creates an element safely. Text is always set via textContent (never innerHTML),
 * so data from the API cannot inject markup.
 */
export function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'className') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** Parses a trusted, static SVG string (from icons.js) into an element. */
export function svg(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
}

/** Returns the URL only if it is http(s) or a site-relative path; otherwise null. */
export function safeUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

export function pad(number, length = 2) {
  return String(number).padStart(length, '0');
}

/** Runs `callback` once when `element` first enters the viewport. */
export function onFirstVisible(element, callback, options = { threshold: 0.35 }) {
  if (!element) return;
  if (!('IntersectionObserver' in window)) {
    callback();
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      callback();
    }
  }, options);
  observer.observe(element);
}

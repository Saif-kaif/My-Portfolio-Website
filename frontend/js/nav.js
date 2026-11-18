import { $, $$ } from './utils.js';

const DESKTOP_QUERY = window.matchMedia('(min-width: 900px)');

/** Sticky header, mobile menu, active-section tracking and sliding indicator. */
export function initNav() {
  const header = $('[data-header]');
  const toggle = $('[data-nav-toggle]');
  const menu = $('[data-nav-menu]');
  const indicator = $('[data-nav-indicator]');
  const links = $$('.nav__link, .nav__link--cta', menu);
  if (!header || !toggle || !menu) return;

  // ---------- Header background on scroll ----------
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // ---------- Mobile menu ----------
  const setOpen = (open, { returnFocus = false } = {}) => {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) links[0]?.focus({ preventScroll: true });
    else if (returnFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  links.forEach((link) => link.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) setOpen(false, { returnFocus: true });
  });

  DESKTOP_QUERY.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
    moveIndicator();
  });

  // ---------- Active link indicator ----------
  let activeLink = null;

  function moveIndicator() {
    if (!indicator) return;
    const target = activeLink && !activeLink.classList.contains('nav__link--cta') ? activeLink : null;
    if (!target || !DESKTOP_QUERY.matches) {
      indicator.classList.remove('is-visible');
      return;
    }
    const menuRect = menu.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const inset = 14; // matches link horizontal padding
    indicator.style.setProperty('--indicator-x', `${rect.left - menuRect.left + inset}px`);
    indicator.style.setProperty('--indicator-w', `${Math.max(rect.width - inset * 2, 0)}px`);
    indicator.classList.add('is-visible');
  }

  function setActive(id) {
    const next = links.find((link) => link.getAttribute('href') === `#${id}`) ?? null;
    if (next === activeLink) return;
    links.forEach((link) => {
      const isActive = link === next;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    activeLink = next;
    moveIndicator();
  }

  const sections = links
    .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    // A thin band across the middle of the viewport decides the active section.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
  }

  window.addEventListener('resize', moveIndicator, { passive: true });
  document.fonts?.ready.then(moveIndicator);
  setActive(window.location.hash ? window.location.hash.slice(1) : 'home');
}

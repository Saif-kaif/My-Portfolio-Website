import { api } from './api.js';
import { ICONS } from './icons.js';
import { observeReveal } from './reveal.js';
import { $, h, safeUrl, svg } from './utils.js';

const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function formatDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

function placeholder() {
  return h('div', { className: 'project-card__placeholder', 'aria-hidden': 'true', text: '</>' });
}

/** Fills a clone of the reusable <template id="project-card-template">. */
export function createProjectCard(template, project, index = 0) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.classList.add('reveal', `reveal-delay-${index % 3}`);
  const slot = (name) => card.querySelector(`[data-slot="${name}"]`);

  // Media
  const imageUrl = safeUrl(project.image_url);
  if (imageUrl) {
    const img = h('img', {
      src: imageUrl,
      alt: `Preview of ${project.title}`,
      loading: 'lazy',
      decoding: 'async',
      width: 640,
      height: 360,
    });
    img.addEventListener('error', () => img.replaceWith(placeholder()), { once: true });
    slot('media').append(img);
  } else {
    slot('media').append(placeholder());
  }

  // Text
  const formatted = formatDate(project.project_date);
  if (formatted) slot('date').append(h('time', { datetime: project.project_date.slice(0, 10), text: formatted }));
  slot('title').textContent = project.title;
  slot('description').textContent = project.description;

  // Technologies
  (Array.isArray(project.technologies) ? project.technologies : []).forEach((tech) => {
    slot('technologies').append(h('li', { className: 'tech-chip', text: tech }));
  });

  // Links (only rendered when real URLs exist)
  const links = [
    { url: safeUrl(project.github_url), label: 'Source code', icon: ICONS.github },
    { url: safeUrl(project.demo_url), label: 'Live demo', icon: ICONS.external },
  ];
  links
    .filter((link) => link.url)
    .forEach((link) => {
      slot('links').append(
        h('a', { className: 'project-link', href: link.url, target: '_blank', rel: 'noopener noreferrer' }, [
          svg(link.icon),
          link.label,
          h('span', { className: 'sr-only', text: ` for ${project.title} (opens in a new tab)` }),
        ]),
      );
    });

  return card;
}

/** Loads projects from PostgreSQL via the API; shows an empty state when none exist. */
export function initProjects() {
  const root = $('[data-projects]');
  const loading = $('[data-projects-loading]');
  const empty = $('[data-projects-empty]');
  const grid = $('[data-projects-grid]');
  const template = $('#project-card-template');
  if (!root || !grid || !template) return;

  const render = (projects) => {
    if (loading) loading.hidden = true;
    root.setAttribute('aria-busy', 'false');

    if (projects.length === 0) {
      grid.hidden = true;
      if (empty) {
        empty.hidden = false;
        observeReveal(empty);
      }
      return;
    }

    const cards = projects.map((project, index) => createProjectCard(template, project, index));
    grid.replaceChildren(...cards);
    grid.hidden = false;
    if (empty) empty.hidden = true;
    observeReveal(cards);
  };

  api
    .projects()
    .then(({ data }) => render(Array.isArray(data) ? data : []))
    .catch(() => render([]));
}

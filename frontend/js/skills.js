import { api } from './api.js';
import { skillIcon } from './icons.js';
import { observeReveal } from './reveal.js';
import { $, $$, h, pad, prefersReducedMotion, svg } from './utils.js';

/** Interactive skills grid with category filters, rendered from the API. */
export function initSkills() {
  const grid = $('[data-skills-grid]');
  const filters = $('[data-skill-filters]');
  const status = $('[data-skills-status]');
  if (!grid || !filters) return;

  let activeCategory = 'all';
  let skills = $$('.skill-card', grid).map((card) => ({
    name: $('.skill-card__name', card)?.textContent.trim() ?? '',
    category: card.dataset.category ?? '',
  }));

  const signature = (list) => list.map((s) => `${s.name}::${s.category}`).join('|');

  // ---------- Rendering ----------
  function createCard(skill, index) {
    return h('li', { className: `skill-card reveal reveal-delay-${index % 4}`, dataset: { category: skill.category } }, [
      h('span', { className: 'skill-card__index', 'aria-hidden': 'true', text: pad(index + 1) }),
      h('span', { className: 'skill-card__icon', 'aria-hidden': 'true' }, [svg(skillIcon(skill.name))]),
      h('h3', { className: 'skill-card__name', text: skill.name }),
      h('p', { className: 'skill-card__category', text: skill.category }),
    ]);
  }

  function renderFilters() {
    const categories = [...new Set(skills.map((s) => s.category))];
    const count = (category) => (category === 'all' ? skills.length : skills.filter((s) => s.category === category).length);
    const buttons = ['all', ...categories].map((category) =>
      h('button', { className: 'filter-btn', type: 'button', 'aria-pressed': 'false', dataset: { filter: category } }, [
        category === 'all' ? 'All' : category,
        h('span', { className: 'filter-btn__count', 'aria-hidden': 'true', text: count(category) }),
      ]),
    );
    filters.replaceChildren(...buttons);
    if (activeCategory !== 'all' && !categories.includes(activeCategory)) activeCategory = 'all';
  }

  function applyFilter(category, { announce = false } = {}) {
    activeCategory = category;
    $$('.filter-btn', filters).forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.filter === category)));

    let visible = 0;
    $$('.skill-card', grid).forEach((card) => {
      const matches = category === 'all' || card.dataset.category === category;
      if (matches) {
        visible += 1;
        if (card.hidden) {
          card.hidden = false;
          if (!prefersReducedMotion()) {
            card.classList.remove('is-entering');
            void card.offsetWidth; // restart the animation
            card.classList.add('is-entering');
          }
        }
      } else {
        card.hidden = true;
      }
    });

    if (announce && status) {
      const noun = visible === 1 ? 'skill' : 'skills';
      status.textContent = category === 'all' ? `Showing all ${visible} ${noun}.` : `Showing ${visible} ${noun} in ${category}.`;
    }
  }

  // ---------- Events ----------
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (button) applyFilter(button.dataset.filter, { announce: true });
  });

  // Pointer-following spotlight on cards
  grid.addEventListener('pointermove', (event) => {
    const card = event.target.closest('.skill-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
  });

  renderFilters();
  applyFilter(activeCategory);

  // ---------- Hydrate from the API ----------
  api
    .skills()
    .then(({ data }) => {
      if (!Array.isArray(data) || data.length === 0 || signature(data) === signature(skills)) return;
      skills = data.map(({ name, category }) => ({ name, category }));
      const cards = skills.map(createCard);
      grid.replaceChildren(...cards);
      renderFilters();
      applyFilter(activeCategory);
      observeReveal(cards);
    })
    .catch(() => {
      /* Static verified skills remain visible. */
    });
}

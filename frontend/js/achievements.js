import { api } from './api.js';
import { ICONS, medalIcon } from './icons.js';
import { observeReveal } from './reveal.js';
import { $, $$, h, safeUrl, svg } from './utils.js';

function createAwardCard(achievement, index) {
  const level = achievement.award_level?.trim();
  const certificateUrl = safeUrl(achievement.certificate_url);
  const eyebrow = /international award/i.test(achievement.title) ? 'International Award' : 'Achievement';

  const metaItems = [];
  if (level) {
    metaItems.push(
      h('div', {}, [
        h('dt', { text: 'Recognition level' }),
        h('dd', {}, [h('span', { className: 'badge badge--bronze', text: level })]),
      ]),
    );
  }
  if (certificateUrl) {
    metaItems.push(
      h('div', {}, [
        h('dt', { text: 'Certificate' }),
        h('dd', {}, [
          h('a', { className: 'award-card__link', href: certificateUrl, target: '_blank', rel: 'noopener noreferrer' }, [
            'View certificate',
            svg(ICONS.external),
            h('span', { className: 'sr-only', text: ' (opens in a new tab)' }),
          ]),
        ]),
      ]),
    );
  }

  return h('article', { className: `award-card reveal reveal-delay-${index % 3}` }, [
    h('div', { className: 'award-card__medal', 'aria-hidden': 'true' }, [svg(medalIcon(`a${achievement.id ?? index}`))]),
    h('div', { className: 'award-card__body' }, [
      h('p', { className: 'award-card__eyebrow', text: eyebrow }),
      h('h3', { className: 'award-card__title', text: achievement.title }),
      level ? h('p', { className: 'award-card__subtitle', text: `${level} Award` }) : null,
      achievement.description ? h('p', { className: 'section-lead', text: achievement.description }) : null,
      metaItems.length ? h('dl', { className: 'award-card__meta' }, metaItems) : null,
    ]),
  ]);
}

/** Renders achievements from the API; the verified award is already in the HTML. */
export function initAchievements() {
  const container = $('[data-achievements]');
  if (!container) return;

  api
    .achievements()
    .then(({ data }) => {
      if (!Array.isArray(data) || data.length === 0) return;
      const staticTitles = $$('.award-card__title', container).map((el) => el.textContent.trim());
      const unchanged =
        staticTitles.join('|') === data.map((a) => a.title).join('|') &&
        data.every((a) => !a.description && !a.certificate_url);
      if (unchanged) return; // avoid re-rendering identical content

      const cards = data.map(createAwardCard);
      container.replaceChildren(...cards);
      observeReveal(cards);
    })
    .catch(() => {
      /* Static verified achievement remains visible. */
    });
}

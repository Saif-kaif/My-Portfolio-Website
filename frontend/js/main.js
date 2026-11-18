import { initAcademic } from './academic.js';
import { initAchievements } from './achievements.js';
import { initContact } from './contact.js';
import { initEffects } from './effects.js';
import { initHero } from './hero.js';
import { initNav } from './nav.js';
import { initProjects } from './projects.js';
import { initReveal, revealEverything } from './reveal.js';
import { initSkills } from './skills.js';

// Tell the boot failsafe that the app started.
document.documentElement.dataset.ready = 'true';

const modules = [
  ['reveal', initReveal], // first, so later modules can register dynamic content
  ['nav', initNav],
  ['hero', initHero],
  ['effects', initEffects],
  ['academic', initAcademic],
  ['skills', initSkills],
  ['achievements', initAchievements],
  ['projects', initProjects],
  ['contact', initContact],
];

for (const [name, init] of modules) {
  try {
    init();
  } catch (error) {
    console.error(`[portfolio] "${name}" failed to initialise:`, error);
    if (name === 'reveal') revealEverything();
  }
}

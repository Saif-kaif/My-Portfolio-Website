import { apiRequest } from './api.js';
import { $, $$, h } from './utils.js';

const admin = {
  session: () => apiRequest('/admin/session'),
  login: (credentials) => apiRequest('/admin/login', { method: 'POST', body: credentials }),
  logout: () => apiRequest('/admin/logout', { method: 'POST' }),
  projects: () => apiRequest('/admin/projects'),
  createProject: (data) => apiRequest('/admin/projects', { method: 'POST', body: data }),
  updateProject: (id, data) => apiRequest(`/admin/projects/${id}`, { method: 'PUT', body: data }),
  deleteProject: (id) => apiRequest(`/admin/projects/${id}`, { method: 'DELETE' }),
  messages: (offset = 0) => apiRequest(`/admin/messages?limit=25&offset=${offset}`),
  deleteMessage: (id) => apiRequest(`/admin/messages/${id}`, { method: 'DELETE' }),
  achievements: () => apiRequest('/admin/achievements'),
  setCertificate: (id, url) =>
    apiRequest(`/admin/achievements/${id}/certificate`, { method: 'PUT', body: { certificate_url: url } }),
};

const dateTime = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

// ---------------------------------------------------------------------
// View helpers
// ---------------------------------------------------------------------
const views = {
  loading: $('[data-loading]'),
  login: $('[data-login-view]'),
  dashboard: $('[data-dashboard]'),
  user: $('[data-user]'),
};

let toastTimer;
function toast(type, message) {
  const el = $('[data-global-status]');
  el.className = `form-status admin-toast is-${type}`;
  el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.textContent = ''), 4000);
}

function setStatus(el, type, message) {
  el.className = `form-status${type ? ` is-${type}` : ''}`;
  el.textContent = message || '';
}

function showLogin() {
  views.loading.hidden = true;
  views.dashboard.hidden = true;
  views.user.hidden = true;
  views.login.hidden = false;
  $('#login-username').focus();
}

async function showDashboard(username) {
  views.loading.hidden = true;
  views.login.hidden = true;
  views.dashboard.hidden = false;
  views.user.hidden = false;
  $('[data-username]').textContent = username;
  await Promise.all([loadProjects(), loadMessages(), loadAchievements()]);
}

/** Any 401 means the session ended: return to the sign-in form. */
function handleError(error, statusEl) {
  if (error.status === 401) {
    showLogin();
    setStatus($('[data-login-status]'), 'error', 'Your session has ended. Please sign in again.');
    return;
  }
  if (statusEl) setStatus(statusEl, 'error', error.message);
  else toast('error', error.message);
}

// ---------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------
$('[data-login-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $('[data-login-status]');
  const button = form.querySelector('button[type="submit"]');
  const username = form.elements.namedItem('username').value.trim();
  const password = form.elements.namedItem('password').value;

  if (!username || !password) {
    setStatus(status, 'error', 'Enter your username and password.');
    return;
  }

  button.disabled = true;
  setStatus(status, null, '');
  try {
    const { data } = await admin.login({ username, password });
    form.reset();
    await showDashboard(data.username);
  } catch (error) {
    setStatus(status, 'error', error.message);
  } finally {
    button.disabled = false;
  }
});

$('[data-logout]').addEventListener('click', async () => {
  try {
    await admin.logout();
  } catch {
    /* already signed out */
  }
  showLogin();
});

// ---------------------------------------------------------------------
// Tabs (WAI-ARIA tabs pattern)
// ---------------------------------------------------------------------
const tabs = $$('.admin-tab');
function selectTab(tab) {
  tabs.forEach((t) => {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!delta) return;
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

// ---------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------
const projectForm = $('[data-project-form]');
const projectStatus = $('[data-project-status]');
let projectCache = [];

function resetProjectForm() {
  projectForm.reset();
  projectForm.elements.namedItem('id').value = '';
  $('[data-project-form-title]').textContent = 'Add project';
  $('[data-project-submit]').textContent = 'Add project';
  $('[data-project-cancel]').hidden = true;
  $$('[data-error-for]', projectForm).forEach((el) => (el.textContent = ''));
  $$('[aria-invalid]', projectForm).forEach((el) => el.removeAttribute('aria-invalid'));
}

function editProject(project) {
  const set = (name, value) => (projectForm.elements.namedItem(name).value = value ?? '');
  set('id', project.id);
  set('title', project.title);
  set('description', project.description);
  set('technologies', (project.technologies || []).join(', '));
  set('image_url', project.image_url);
  set('github_url', project.github_url);
  set('demo_url', project.demo_url);
  set('project_date', project.project_date);
  $('[data-project-form-title]').textContent = 'Edit project';
  $('[data-project-submit]').textContent = 'Save changes';
  $('[data-project-cancel]').hidden = false;
  setStatus(projectStatus, null, '');
  projectForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  projectForm.elements.namedItem('title').focus({ preventScroll: true });
}

function renderProjects() {
  const list = $('[data-project-list]');
  $('[data-project-count]').textContent = String(projectCache.length);
  $('[data-project-empty]').hidden = projectCache.length > 0;

  list.replaceChildren(
    ...projectCache.map((project) => {
      const editBtn = h('button', { className: 'btn btn--ghost btn--sm', type: 'button', text: 'Edit' });
      const deleteBtn = h('button', { className: 'btn btn--ghost btn--sm btn--danger', type: 'button', text: 'Delete' });
      editBtn.addEventListener('click', () => editProject(project));
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
        try {
          await admin.deleteProject(project.id);
          toast('success', 'Project deleted.');
          if (projectForm.elements.namedItem('id').value === String(project.id)) resetProjectForm();
          await loadProjects();
        } catch (error) {
          handleError(error);
        }
      });

      const meta = [project.project_date, (project.technologies || []).join(', ')].filter(Boolean).join(' · ');
      return h('li', { className: 'admin-item' }, [
        h('p', { className: 'admin-item__title', text: project.title }),
        meta ? h('p', { className: 'admin-item__meta', text: meta }) : null,
        h('div', { className: 'admin-item__actions' }, [editBtn, deleteBtn]),
      ]);
    }),
  );
}

async function loadProjects() {
  try {
    const { data } = await admin.projects();
    projectCache = data;
    renderProjects();
  } catch (error) {
    handleError(error);
  }
}

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const get = (name) => projectForm.elements.namedItem(name).value;
  const id = get('id');
  const payload = {
    title: get('title'),
    description: get('description'),
    technologies: get('technologies'),
    image_url: get('image_url'),
    github_url: get('github_url'),
    demo_url: get('demo_url'),
    project_date: get('project_date'),
  };

  $$('[data-error-for]', projectForm).forEach((el) => (el.textContent = ''));
  $$('[aria-invalid]', projectForm).forEach((el) => el.removeAttribute('aria-invalid'));
  const submit = $('[data-project-submit]');
  submit.disabled = true;

  try {
    if (id) await admin.updateProject(id, payload);
    else await admin.createProject(payload);
    resetProjectForm();
    setStatus(projectStatus, 'success', id ? 'Project updated.' : 'Project added. It is now visible on the site.');
    await loadProjects();
  } catch (error) {
    if (error.details) {
      Object.entries(error.details).forEach(([field, message]) => {
        const errorEl = projectForm.querySelector(`[data-error-for="${field}"]`);
        if (errorEl) errorEl.textContent = message;
        projectForm.elements.namedItem(field)?.setAttribute('aria-invalid', 'true');
      });
    }
    handleError(error, projectStatus);
  } finally {
    submit.disabled = false;
  }
});

$('[data-project-cancel]').addEventListener('click', () => {
  resetProjectForm();
  setStatus(projectStatus, null, '');
});

// ---------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------
let messageOffset = 0;

function messageItem(message) {
  const deleteBtn = h('button', { className: 'btn btn--ghost btn--sm btn--danger', type: 'button', text: 'Delete' });
  const item = h('li', { className: 'admin-item' }, [
    h('p', { className: 'admin-item__title', text: message.sender_name }),
    h('p', { className: 'admin-item__meta', text: `${message.sender_email} · ${dateTime.format(new Date(message.created_at))}` }),
    h('p', { className: 'admin-item__body', text: message.message }),
    h('div', { className: 'admin-item__actions' }, [deleteBtn]),
  ]);
  deleteBtn.addEventListener('click', async () => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    try {
      await admin.deleteMessage(message.id);
      toast('success', 'Message deleted.');
      await loadMessages();
    } catch (error) {
      handleError(error);
    }
  });
  return item;
}

async function loadMessages({ append = false } = {}) {
  try {
    if (!append) messageOffset = 0;
    const { data, meta } = await admin.messages(messageOffset);
    const list = $('[data-message-list]');
    const items = data.map(messageItem);
    if (append) list.append(...items);
    else list.replaceChildren(...items);
    messageOffset += data.length;
    $('[data-message-count]').textContent = String(meta.total);
    $('[data-message-empty]').hidden = meta.total > 0;
    $('[data-message-more]').hidden = messageOffset >= meta.total;
  } catch (error) {
    handleError(error);
  }
}

$('[data-message-more]').addEventListener('click', () => loadMessages({ append: true }));

// ---------------------------------------------------------------------
// Achievements (certificate links)
// ---------------------------------------------------------------------
async function loadAchievements() {
  try {
    const { data } = await admin.achievements();
    $('[data-achievement-list]').replaceChildren(
      ...data.map((achievement) => {
        const inputId = `cert-${achievement.id}`;
        const input = h('input', {
          className: 'field__input',
          id: inputId,
          type: 'text',
          inputmode: 'url',
          placeholder: 'https://… or /assets/certificates/…',
          value: achievement.certificate_url ?? '',
        });
        const form = h('form', { className: 'admin-cert-form', novalidate: true }, [
          h('div', { className: 'field' }, [h('label', { className: 'field__label', for: inputId, text: 'Certificate URL' }), input]),
          h('button', { className: 'btn btn--primary btn--sm', type: 'submit', text: 'Save' }),
        ]);
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          try {
            await admin.setCertificate(achievement.id, input.value.trim());
            toast('success', input.value.trim() ? 'Certificate link saved.' : 'Certificate link removed.');
          } catch (error) {
            handleError(error);
            if (error.details?.certificate_url) toast('error', error.details.certificate_url);
          }
        });
        return h('li', { className: 'admin-item' }, [
          h('p', { className: 'admin-item__title', text: achievement.title }),
          achievement.award_level ? h('p', { className: 'admin-item__meta', text: `Level: ${achievement.award_level}` }) : null,
          form,
        ]);
      }),
    );
  } catch (error) {
    handleError(error);
  }
}

// ---------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------
admin
  .session()
  .then(({ data }) => showDashboard(data.username))
  .catch((error) => {
    showLogin();
    if (error.status !== 401) setStatus($('[data-login-status]'), 'error', error.message);
  });

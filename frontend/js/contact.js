import { api } from './api.js';
import { $ } from './utils.js';

// Mirrors the server-side limits in backend/src/utils/validation.js
const LIMITS = { nameMin: 2, nameMax: 100, emailMax: 254, messageMin: 10, messageMax: 2000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const length = (value) => [...value].length;

function validate({ name, email, message }) {
  const errors = {};
  if (!name) errors.name = 'Please enter your name.';
  else if (length(name) < LIMITS.nameMin || length(name) > LIMITS.nameMax)
    errors.name = `Name must be between ${LIMITS.nameMin} and ${LIMITS.nameMax} characters.`;

  if (!email) errors.email = 'Please enter your email address.';
  else if (email.length > LIMITS.emailMax || !EMAIL_PATTERN.test(email)) errors.email = 'Please enter a valid email address.';

  if (!message) errors.message = 'Please enter a message.';
  else if (length(message) < LIMITS.messageMin) errors.message = `Message must be at least ${LIMITS.messageMin} characters.`;
  else if (length(message) > LIMITS.messageMax) errors.message = `Message must be at most ${LIMITS.messageMax} characters.`;
  return errors;
}

/** Contact form with client-side validation, API submission and accessible feedback. */
export function initContact() {
  const form = $('[data-contact-form]');
  if (!form) return;

  const status = $('[data-form-status]', form);
  const submit = $('[data-submit]', form);
  const submitLabel = $('[data-submit-label]', form);
  const counter = $('[data-char-count]', form);
  const fields = {
    name: form.elements.namedItem('name'),
    email: form.elements.namedItem('email'),
    message: form.elements.namedItem('message'),
  };
  const touched = new Set();

  const values = () => ({
    name: fields.name.value.trim().replace(/\s+/g, ' '),
    email: fields.email.value.trim(),
    message: fields.message.value.trim(),
  });

  const setFieldError = (name, message) => {
    const input = fields[name];
    const error = form.querySelector(`[data-error-for="${name}"]`);
    if (!input) return;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    if (error) error.textContent = message || '';
  };

  const showErrors = (errors) => Object.keys(fields).forEach((name) => setFieldError(name, errors[name]));

  const setStatus = (type, message) => {
    status.className = `form-status${type ? ` is-${type}` : ''}`;
    status.textContent = message || '';
  };

  const setLoading = (loading) => {
    submit.disabled = loading;
    submit.classList.toggle('is-loading', loading);
    form.setAttribute('aria-busy', String(loading));
    submitLabel.textContent = loading ? 'Sending…' : 'Send Message';
  };

  const updateCounter = () => {
    const count = length(fields.message.value);
    counter.textContent = String(count);
    counter.parentElement.classList.toggle('is-over', count > LIMITS.messageMax);
  };

  // Validate a field once the user has left it, then live while they fix it.
  Object.entries(fields).forEach(([name, input]) => {
    input.addEventListener('blur', () => {
      if (!input.value.trim()) return;
      touched.add(name);
      setFieldError(name, validate(values())[name]);
    });
    input.addEventListener('input', () => {
      if (touched.has(name)) setFieldError(name, validate(values())[name]);
    });
  });
  fields.message.addEventListener('input', updateCounter);
  updateCounter();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    setStatus(null, '');

    const data = values();
    const errors = validate(data);
    Object.keys(fields).forEach((name) => touched.add(name));
    showErrors(errors);

    const firstInvalid = Object.keys(fields).find((name) => errors[name]);
    if (firstInvalid) {
      fields[firstInvalid].focus();
      setStatus('error', 'Please correct the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.sendMessage({
        ...data,
        website: form.elements.namedItem('website')?.value ?? '',
      });
      form.reset();
      touched.clear();
      showErrors({});
      updateCounter();
      setStatus('success', response?.message || 'Thank you! Your message has been received.');
    } catch (error) {
      if (error.details) {
        showErrors(error.details);
        const invalid = Object.keys(fields).find((name) => error.details[name]);
        if (invalid) fields[invalid].focus();
      }
      setStatus('error', error.message || 'Your message could not be sent. Please try again.');
    } finally {
      setLoading(false);
    }
  });
}

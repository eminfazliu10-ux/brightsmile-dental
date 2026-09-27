/* ==========================================================================
   BrightSmile Dental Studio — Scripts
   --------------------------------------------------------------------------
   Vanilla JavaScript, no dependencies. Each feature lives in its own
   small function, all started from init() at the bottom of the file.
   ========================================================================== */

'use strict';

// Mark the page as JS-enabled before it paints, so scroll animations
// never hide content for visitors who have JavaScript turned off.
document.documentElement.classList.add('js');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Updates the address bar without jumping. Some embedded frames block this, so it never throws. */
function setHash(hash) {
  try {
    history.pushState(null, '', hash);
  } catch (error) {
    /* ignore: history is unavailable in some sandboxed frames */
  }
}

/** Returns the current height of the sticky header (used for scroll offsets). */
function getHeaderHeight() {
  const header = document.getElementById('site-header');
  return header ? header.offsetHeight : 0;
}

/* --------------------------------------------------------------------------
   1. Mobile navigation menu
   -------------------------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;

  const main = document.getElementById('main');
  const footer = document.querySelector('.site-footer');
  const isMobile = () => window.matchMedia('(max-width: 960px)').matches;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    // Keep keyboard and screen-reader focus inside the open menu
    [main, footer].forEach((el) => { if (el) el.inert = open; });
    if (open) {
      nav.removeAttribute('inert');
      const firstLink = nav.querySelector('a');
      if (firstLink) firstLink.focus();
    }
  };

  // Hide the off-canvas menu from assistive tech while it is closed on mobile
  const syncHidden = () => {
    nav.toggleAttribute('inert', isMobile() && !nav.classList.contains('is-open'));
  };
  toggle.addEventListener('click', () => requestAnimationFrame(syncHidden));
  syncHidden();

  // Trap Tab inside the header while the menu is open
  document.getElementById('site-header').addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || !nav.classList.contains('is-open')) return;
    const focusables = [toggle, ...nav.querySelectorAll('a')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Close the menu when a link inside it is clicked
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => { setOpen(false); syncHidden(); });
  });

  // Close with the Escape key and return focus to the toggle
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      syncHidden();
      toggle.focus();
    }
  });

  // Reset if the window is resized up to desktop width
  window.matchMedia('(min-width: 961px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
    syncHidden();
  });
}

/* --------------------------------------------------------------------------
   2. Smooth scrolling for in-page links (with sticky-header offset)
   -------------------------------------------------------------------------- */
function initSmoothScroll() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute('href');

    // Bare "#" links should not jump to the top of the page
    if (hash === '#') {
      event.preventDefault();
      return;
    }

    const target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();

    const top = target.getBoundingClientRect().top + window.scrollY - getHeaderHeight() + 1;
    window.scrollTo({ top: hash === '#home' ? 0 : top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });

    // Update the URL without jumping, and move focus for keyboard/screen-reader users
    setHash(hash);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}

/* --------------------------------------------------------------------------
   3. Header shadow, active nav link and back-to-top (one scroll listener)
   -------------------------------------------------------------------------- */
function initScrollEffects() {
  const header = document.getElementById('site-header');
  const backToTop = document.getElementById('back-to-top');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('main section[id]');
  let ticking = false;

  const setActiveLink = (id) => {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  const update = () => {
    const scrollY = window.scrollY;
    const offset = getHeaderHeight() + 120;

    header.classList.toggle('is-scrolled', scrollY > 10);
    backToTop.classList.toggle('is-visible', scrollY > 600);

    // Find the last section whose top has passed the header
    let current = 'home';
    sections.forEach((section) => {
      if (section.offsetTop - offset <= scrollY) {
        // Sections without their own nav link can point to one with data-nav
        current = section.dataset.nav || section.id;
      }
    });

    // Near the very bottom of the page, highlight "Contact"
    const atBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom) current = 'contact';

    setActiveLink(current);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    setHash('#home');
  });

  update();
}

/* --------------------------------------------------------------------------
   4. Scroll-reveal animations + animated statistics
   -------------------------------------------------------------------------- */
function initRevealAnimations() {
  const items = document.querySelectorAll('[data-reveal]');

  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  items.forEach((el) => observer.observe(el));
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length || prefersReducedMotion || !('IntersectionObserver' in window)) return;

  const animate = (el) => {
    const target = Number(el.dataset.count);
    const duration = 1600;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });

  counters.forEach((el) => observer.observe(el));
}

/* --------------------------------------------------------------------------
   5. FAQ accordion
   -------------------------------------------------------------------------- */
function initAccordion() {
  const triggers = document.querySelectorAll('.accordion-trigger');

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion-item');
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      // Close any other open item so only one answer shows at a time
      triggers.forEach((other) => {
        if (other !== trigger) {
          other.setAttribute('aria-expanded', 'false');
          other.closest('.accordion-item').classList.remove('is-open');
        }
      });

      trigger.setAttribute('aria-expanded', String(!isOpen));
      item.classList.toggle('is-open', !isOpen);
    });
  });
}

/* --------------------------------------------------------------------------
   6. Toast notification
   -------------------------------------------------------------------------- */
let toastTimer;

function showToast(message) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toast-text');
  if (!toast || !text) return;

  text.textContent = message;
  toast.classList.add('is-visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
  const toast = document.getElementById('toast');
  if (toast) toast.classList.remove('is-visible');
}

function initToast() {
  const closeBtn = document.querySelector('.toast-close');
  if (closeBtn) closeBtn.addEventListener('click', hideToast);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideToast();
  });
}

/* --------------------------------------------------------------------------
   7. Appointment form validation
   -------------------------------------------------------------------------- */

/** Formats a Date as YYYY-MM-DD in local time (for <input type="date">). */
function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Validation rules. Each returns an error message, or '' when valid. */
const validators = {
  name(value) {
    if (!value) return 'Please enter your full name.';
    if (value.length < 2) return 'Your name looks a little short.';
    if (!/^[a-zA-ZÀ-ÿ' .-]+$/.test(value)) return 'Please use letters only.';
    return '';
  },
  email(value) {
    if (!value) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Please enter a valid email, like jane@example.com.';
    return '';
  },
  phone(value) {
    if (!value) return 'Please enter your phone number.';
    const digits = value.replace(/\D/g, '');
    const isUS = digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
    if (!isUS) return 'Please enter a valid 10-digit U.S. phone number.';
    return '';
  },
  date(value) {
    if (!value) return 'Please choose a preferred date.';
    const [y, m, d] = value.split('-').map(Number);
    const chosen = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (chosen < today) return 'Please choose a date in the future.';
    if (chosen.getDay() === 0) return "We're closed on Sundays. Please pick another day.";
    return '';
  },
  service(value) {
    if (!value) return 'Please select the service you need.';
    return '';
  },
  message(value) {
    if (value.length > 500) return 'Please keep your message under 500 characters.';
    return '';
  },
};

/** Formats U.S. phone numbers while typing: (512) 555-0123 */
function formatPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function initAppointmentForm() {
  const form = document.getElementById('appointment-form');
  const success = document.getElementById('form-success');
  const successText = document.getElementById('success-text');
  const submitBtn = document.getElementById('submit-btn');
  const newRequestBtn = document.getElementById('new-request');
  const dateInput = document.getElementById('date');
  const phoneInput = document.getElementById('phone');
  const message = document.getElementById('message');
  const counter = document.getElementById('message-count');
  if (!form) return;

  // Earliest selectable date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = toDateInputValue(tomorrow);

  const fields = Object.keys(validators).map((name) => form.elements[name]);

  /** Validates one field and shows/hides its error message. */
  const validateField = (field) => {
    const error = validators[field.name](field.value.trim());
    const wrapper = field.closest('.field');
    const errorEl = document.getElementById(`${field.id}-error`);

    wrapper.classList.toggle('has-error', Boolean(error));
    wrapper.classList.toggle('is-valid', !error && field.value.trim() !== '');
    field.setAttribute('aria-invalid', String(Boolean(error)));
    errorEl.textContent = error;
    return !error;
  };

  fields.forEach((field) => {
    // Validate when the user leaves a field…
    field.addEventListener('blur', () => {
      if (field.value.trim() !== '' || field.closest('.field').classList.contains('has-error')) {
        validateField(field);
      }
    });
    // …and re-check live once an error is showing
    field.addEventListener('input', () => {
      if (field.closest('.field').classList.contains('has-error')) validateField(field);
    });
    field.addEventListener('change', () => {
      if (field.tagName === 'SELECT' || field.type === 'date') validateField(field);
    });
  });

  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  message.addEventListener('input', () => {
    counter.textContent = `${message.value.length} / 500`;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const results = fields.map(validateField);
    const firstInvalid = fields[results.indexOf(false)];

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // Demo only: simulate a short network request, nothing is sent anywhere
    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-label').textContent = 'Sending…';

    setTimeout(() => {
      const firstName = form.elements.name.value.trim().split(' ')[0];
      const [y, m, d] = form.elements.date.value.split('-').map(Number);
      const niceDate = new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      });

      successText.textContent =
        `Thank you, ${firstName}! Your ${form.elements.service.value} request for ${niceDate} ` +
        'has been received. Our patient coordinator will contact you within one business day to confirm.';

      form.hidden = true;
      success.hidden = false;
      success.focus();

      showToast('Appointment request received. We\'ll be in touch soon!');

      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-label').textContent = 'Request Appointment';
    }, 1200);
  });

  newRequestBtn.addEventListener('click', () => {
    form.reset();
    counter.textContent = '0 / 500';
    fields.forEach((field) => {
      field.closest('.field').classList.remove('has-error', 'is-valid');
      field.removeAttribute('aria-invalid');
    });
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
}

/** "Book this service" links pre-select the matching service in the form. */
function initServicePrefill() {
  const select = document.getElementById('service');
  if (!select) return;

  document.querySelectorAll('[data-service]').forEach((link) => {
    link.addEventListener('click', () => {
      select.value = link.dataset.service;
      select.dispatchEvent(new Event('change'));
    });
  });
}

/* --------------------------------------------------------------------------
   8. Opening-hours status (Austin time)
   -------------------------------------------------------------------------- */
function initOpenStatus() {
  const badge = document.getElementById('open-status');
  if (!badge) return;

  // Hours per weekday (0 = Sunday), in 24h decimal time
  const schedule = {
    0: null,
    1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18],
    5: [8, 16],
    6: [9, 14],
  };

  let now;
  try {
    // Show status based on the clinic's local time zone (Central Time)
    now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  } catch (error) {
    now = new Date();
  }

  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  const hours = schedule[day];
  const isOpen = Boolean(hours) && hour >= hours[0] && hour < hours[1];

  badge.textContent = isOpen ? 'Open now' : 'Closed now';
  badge.classList.add(isOpen ? 'is-open' : 'is-closed');

  // Highlight today's row in the hours list
  const rowIndex = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 2, 0: 3 }[day];
  const rows = document.querySelectorAll('.hours > div');
  if (rows[rowIndex]) rows[rowIndex].classList.add('is-today');
}

/** Shows the next open business day in the hero card (skips Sundays). */
function initNextSlot() {
  const slot = document.getElementById('next-slot');
  if (!slot) return;

  const next = new Date();
  next.setDate(next.getDate() + 1);
  if (next.getDay() === 0) next.setDate(next.getDate() + 1);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const label = next.toDateString() === tomorrow.toDateString()
    ? 'Tomorrow'
    : next.toLocaleDateString('en-US', { weekday: 'long' });
  slot.textContent = `${label}, 9:30 AM`;
}

/* --------------------------------------------------------------------------
   9. Footer year
   -------------------------------------------------------------------------- */
function initYear() {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}

/* --------------------------------------------------------------------------
   Start everything
   -------------------------------------------------------------------------- */
function init() {
  initMobileNav();
  initSmoothScroll();
  initScrollEffects();
  initRevealAnimations();
  initCounters();
  initAccordion();
  initToast();
  initAppointmentForm();
  initServicePrefill();
  initOpenStatus();
  initNextSlot();
  initYear();
}

document.addEventListener('DOMContentLoaded', init);

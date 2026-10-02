(() => {
  const root = document.documentElement;

  // Theme toggle: an explicit choice overrides the system preference.
  const themeToggle = document.getElementById('theme-toggle');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  const currentTheme = () =>
    root.dataset.theme || (systemDark.matches ? 'dark' : 'light');

  const syncThemeLabel = () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
  };

  themeToggle.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch (e) {}
    syncThemeLabel();
  });
  systemDark.addEventListener('change', syncThemeLabel);
  syncThemeLabel();

  // Mobile navigation
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  const setMenu = (open) => {
    navLinks.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  navToggle.addEventListener('click', () =>
    setMenu(navToggle.getAttribute('aria-expanded') !== 'true'),
  );
  navLinks.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', (event) => {
    const outside = !navLinks.contains(event.target) && !navToggle.contains(event.target);
    if (outside && navLinks.classList.contains('is-open')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navLinks.classList.contains('is-open')) {
      setMenu(false);
      navToggle.focus();
    }
  });

  // Header hairline once the page leaves the top; a sentinel avoids scroll listeners.
  const header = document.querySelector('.site-header');
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  document.body.prepend(sentinel);
  new IntersectionObserver(([entry]) =>
    header.classList.toggle('is-scrolled', !entry.isIntersecting),
  ).observe(sentinel);

  // Current section in the nav
  const navAnchors = [...navLinks.querySelectorAll('a[href^="#"]')];
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach((a) =>
          a.toggleAttribute('aria-current', a.hash === `#${entry.target.id}`),
        );
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  navAnchors.forEach((a) => {
    const section = document.querySelector(a.hash);
    if (section) sectionObserver.observe(section);
  });

  // Lightbox: shots in the same data-group are browsable with arrow keys.
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox.querySelector('.lightbox__img');
  const lightboxCaption = lightbox.querySelector('.lightbox__caption');
  const prevBtn = lightbox.querySelector('.lightbox__prev');
  const nextBtn = lightbox.querySelector('.lightbox__next');
  let group = [];
  let index = 0;
  let opener = null;

  const show = (i) => {
    index = (i + group.length) % group.length;
    const img = group[index].querySelector('img');
    lightboxImg.src = img.dataset.full || img.currentSrc || img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent =
      group.length > 1 ? `${img.alt} (${index + 1} of ${group.length})` : img.alt;
  };

  document.querySelectorAll('.shot').forEach((shot) => {
    shot.setAttribute('aria-haspopup', 'dialog');
    shot.addEventListener('click', () => {
      group = [...document.querySelectorAll(`.shot[data-group="${shot.dataset.group}"]`)];
      opener = shot;
      prevBtn.hidden = nextBtn.hidden = group.length < 2;
      show(group.indexOf(shot));
      lightbox.showModal();
    });
  });

  prevBtn.addEventListener('click', () => show(index - 1));
  nextBtn.addEventListener('click', () => show(index + 1));
  lightbox.querySelector('.lightbox__close').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener('keydown', (event) => {
    if (group.length < 2) return;
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });
  lightbox.addEventListener('close', () => {
    lightboxImg.removeAttribute('src');
    opener?.focus();
  });
})();

'use strict';

function showWelcome() {
  const storageKey = 'sdc-buggy-team-intro-seen';
  try {
    if (localStorage.getItem(storageKey) === 'yes') return;
  } catch {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dialog = document.getElementById('welcome-screen');
  if (typeof dialog.showModal !== 'function') return;

  const portrait = document.getElementById('welcome-photo');
  const team = document.getElementById('team-photo');
  const pixels = document.getElementById('welcome-pixels');
  const flash = document.getElementById('welcome-flash');
  const progress = document.getElementById('welcome-progress');
  const context = pixels.getContext('2d');
  const duration = 3000;
  const revealAt = 480;
  const fadeAt = 2100;
  const start = performance.now();
  const fraction = (value, from, to) => Math.max(0, Math.min(1, (value - from) / (to - from)));

  function tick(now) {
    if (!dialog.open) return;
    const elapsed = now - start;
    progress.value = fraction(elapsed, 0, duration);

    const pulse = fraction(elapsed, revealAt - 130, revealAt + 210);
    flash.style.opacity = 0.4 * Math.sin(Math.PI * pulse);

    if (context && elapsed >= revealAt && team.complete && team.naturalWidth) {
      const reveal = fraction(elapsed, revealAt, fadeAt);
      const width = 18 + Math.round(620 * reveal ** 2.8);
      if (pixels.width !== width) {
        pixels.width = width;
        pixels.height = Math.round(width * team.naturalHeight / team.naturalWidth);
        context.drawImage(team, 0, 0, pixels.width, pixels.height);
      }
      pixels.style.opacity = fraction(elapsed, revealAt, revealAt + 300);
      pixels.style.filter = 'blur(' + (24 * fraction(elapsed, fadeAt, duration)) + 'px)';
    }

    dialog.style.opacity = 1 - fraction(elapsed, fadeAt, duration);
    if (elapsed >= duration) dialog.close();
    else requestAnimationFrame(tick);
  }

  portrait.src = 'splash-photo.png';
  dialog.showModal();
  try { localStorage.setItem(storageKey, 'yes'); } catch {}
  requestAnimationFrame(tick);
}

showWelcome();

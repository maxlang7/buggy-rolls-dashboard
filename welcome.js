'use strict';

function showWelcome() {
  const storageKey = 'sdc-buggy-pushers-intro-seen';
  try {
    if (localStorage.getItem(storageKey) === 'yes') return;
  } catch {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dialog = document.getElementById('welcome-screen');
  if (typeof dialog.showModal !== 'function') return;

  const portrait = document.getElementById('welcome-photo');
  const team = document.getElementById('welcome-team');
  const pixels = document.getElementById('welcome-pixels');
  const flash = document.getElementById('welcome-flash');
  const progress = document.getElementById('welcome-progress');
  const context = pixels.getContext('2d');

  const portraitMs = 450;
  const revealMs = 750;
  const holdMs = 1000;
  const fadeMs = 800;
  const duration = portraitMs + revealMs + holdMs + fadeMs;
  const start = performance.now();
  const fraction = (value, from, to) => Math.max(0, Math.min(1, (value - from) / (to - from)));

  let loaded = false;
  let failed = false;
  let revealStart;
  let sharpSince;
  let fadeStart;

  function tick(now) {
    if (!dialog.open) return;
    const elapsed = now - start;
    progress.value = Math.min(portraitMs, elapsed) / duration;

    if (elapsed >= portraitMs && loaded && revealStart === undefined && fadeStart === undefined) {
      revealStart = now;
    }
    if (revealStart === undefined && elapsed >= portraitMs && (failed || elapsed >= 5000)) {
      fadeStart ??= now;
    }

    if (revealStart !== undefined) {
      const revealElapsed = now - revealStart;
      const reveal = fraction(revealElapsed, 0, revealMs);
      const pulse = fraction(revealElapsed, 0, 300);
      flash.style.opacity = 0.4 * Math.sin(Math.PI * pulse);

      if (context && reveal < 1) {
        const width = 18 + Math.round(480 * reveal ** 2.6);
        if (pixels.width !== width) {
          pixels.width = width;
          pixels.height = Math.round(width * team.naturalHeight / team.naturalWidth);
          context.drawImage(team, 0, 0, pixels.width, pixels.height);
        }
        pixels.style.opacity = fraction(revealElapsed, 0, 220);
      }
      team.style.opacity = fraction(revealElapsed, context ? revealMs - 180 : 0, revealMs);
      if (reveal === 1) {
        pixels.hidden = true;
        portrait.hidden = true;
        sharpSince ??= now;
        if (now - sharpSince >= holdMs) fadeStart ??= now;
      }
      const held = sharpSince === undefined ? 0 : Math.min(holdMs, now - sharpSince);
      progress.value = (portraitMs + Math.min(revealMs, revealElapsed) + held) / duration;
    }

    if (fadeStart !== undefined) {
      const fade = fraction(now, fadeStart, fadeStart + fadeMs);
      const eased = fade * fade * (3 - 2 * fade);
      team.style.filter = 'blur(' + (24 * eased) + 'px)';
      dialog.style.opacity = 1 - eased;
      const fadeProgress = revealStart === undefined ? portraitMs / duration : 1 - fadeMs / duration;
      progress.value = fadeProgress + (1 - fadeProgress) * fade;
      if (fade === 1) {
        dialog.close();
        return;
      }
    }
    requestAnimationFrame(tick);
  }

  portrait.src = 'splash-photo.png';
  team.src = document.getElementById('team-photo').src;
  team.decode().then(() => { loaded = true; }, () => { failed = true; });
  dialog.showModal();
  try { localStorage.setItem(storageKey, 'yes'); } catch {}
  requestAnimationFrame(tick);
}

showWelcome();

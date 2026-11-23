'use strict';

const el = id => document.getElementById(id);
const make = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const colors = ['#3468b3', '#e9b753', '#a38ee2', '#ed8f77', '#87bbe9', '#d88eba', '#9eb85f', '#65c2ca'];

['Total pushes', 'Hill assignments', 'Logged rows', 'Pushers'].forEach((name, index) => {
  const stat = make('div', undefined, 'stat');
  stat.append(make('strong', season.stats[index]), make('span', name));
  el('stats').append(stat);
});

const maxHill = Math.max(...season.hills.map(([, count]) => count));
season.hills.forEach(([name, count], index) => {
  const row = make('div', undefined, 'bar');
  const track = make('div', undefined, 'track');
  const fill = make('div', undefined, 'fill');
  fill.style.width = 100 * count / maxHill + '%';
  fill.style.background = colors[index];
  track.append(fill);
  row.append(make('span', name), track, make('strong', count));
  el('hill-bars').append(row);
});

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
function renderDays(id, countColumn) {
  const max = Math.max(1, ...season.dates.map(row => row[countColumn]));
  for (const row of season.dates) {
    const [date] = row;
    const count = row[countColumn];
    const day = make('div', undefined, 'day');
    const stack = make('div', undefined, 'day-stack');
    const bar = make('i');
    bar.style.height = 144 * count / max + 'px';
    bar.setAttribute('aria-hidden', 'true');
    stack.append(make('strong', count), bar);
    const label = make('time', dateFormat.format(new Date(date)));
    label.dateTime = date;
    day.append(stack, label);
    el(id).append(day);
  }
}

renderDays('buggies-per-day', 1);
renderDays('hills-per-day', 2);

const leaders = pushers.map(([name, ...counts], index) => ({
  name, index, total: counts.reduce((sum, count) => sum + count, 0),
})).sort((a, b) => b.total - a.total).slice(0, 5);
for (const { name, index, total } of leaders) {
  const row = make('li');
  const link = make('a', name);
  link.href = '#pusher-' + index;
  row.append(link, make('strong', total));
  el('leaders').append(row);
}

const mode = el('mode');
const selection = el('selection');
const canvas = make('canvas');
canvas.width = canvas.height = 720;
canvas.setAttribute('aria-hidden', 'true');
el('wheel').append(canvas);
const ctx = canvas.getContext('2d');
let frame;

function draw(parts, total) {
  cancelAnimationFrame(frame);
  if (!ctx) return;
  const ink = getComputedStyle(el('wheel')).color;
  const start = performance.now();
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tau = Math.PI * 2;
  function paint(now) {
    const progress = motion ? Math.min(1, (now - start) / 650) : 1;
    const sweep = 1 - (1 - progress) ** 3;
    ctx.clearRect(0, 0, 720, 720);
    const origin = -Math.PI / 2;
    let angle = origin;
    for (const part of parts) {
      const end = angle + tau * part.count / total;
      const revealed = Math.min(end, origin + tau * sweep);
      if (revealed <= angle) break;
      ctx.beginPath();
      ctx.arc(360, 360, 340, angle, revealed);
      ctx.arc(360, 360, 153, revealed, angle, true);
      ctx.closePath();
      ctx.fillStyle = part.color;
      ctx.fill();
      angle = end;
    }
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 68px system-ui';
    ctx.fillText(total, 360, 360);
    if (progress < 1) frame = requestAnimationFrame(paint);
  }
  frame = requestAnimationFrame(paint);
}

function updateChart() {
  const byHill = mode.value === 'hill';
  const index = Number(selection.value);
  const label = byHill ? season.hills[index][0] : pushers[index][0];
  const rows = byHill
    ? pushers.map(([name, ...counts]) => [name, counts[index]]).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1])
    : season.hills.map(([name], hill) => [name, pushers[index][hill + 1], hill]).filter(([, count]) => count > 0);
  const parts = rows.map(([name, count, hill], i) => {
    const palette = hill ?? i;
    return { name, count, color: colors[palette % colors.length] };
  });
  const total = parts.reduce((sum, part) => sum + part.count, 0);
  el('chart-title').textContent = label;
  el('chart-note').textContent = total + (total === 1 ? ' assignment' : ' assignments');
  el('legend').replaceChildren(...parts.map(({ name, count, color }) => {
    const li = make('li');
    const dot = make('span', undefined, 'dot');
    dot.style.background = color;
    const label = make('span', name);
    li.append(dot, label, make('strong', count + ' · ' + (100 * count / total).toFixed(1) + '%'));
    return li;
  }));
  draw(parts, total);
}

function updateSelection(index = 0) {
  const byHill = mode.value === 'hill';
  el('selection-label').textContent = byHill ? 'Hill' : 'Pusher';
  selection.replaceChildren(...(byHill ? season.hills : pushers).map(([name], index) => {
    const option = make('option', name);
    option.value = index;
    return option;
  }));
  selection.value = index;
  updateChart();
}

function route() {
  const pusherMatch = /^#pusher-(\d+)$/.exec(location.hash);
  const pusherIndex = pusherMatch ? Number(pusherMatch[1]) : -1;
  const showPusher = Boolean(pushers[pusherIndex]);
  const active = location.hash === '#explore' || showPusher ? 'explore' : 'overview';
  for (const id of ['overview', 'explore']) {
    el(id).hidden = id !== active;
    const link = document.querySelector('nav a[href="#' + id + '"]');
    if (id === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (showPusher) {
    mode.value = 'pusher';
    updateSelection(pusherIndex);
    window.scrollTo(0, 0);
  } else if (active === 'explore') {
    updateChart();
  }
}

mode.addEventListener('change', () => updateSelection());
selection.addEventListener('change', updateChart);
window.addEventListener('hashchange', route);
const colorTheme = el('color-theme');
colorTheme.value = document.documentElement.dataset.theme ?? 'system';
colorTheme.addEventListener('change', () => {
  if (colorTheme.value === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = colorTheme.value;
  try {
    localStorage.setItem('rolls-color-theme', colorTheme.value);
  } catch {}
  if (!el('explore').hidden) updateChart();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!el('explore').hidden && colorTheme.value === 'system') updateChart();
});
updateSelection();
route();

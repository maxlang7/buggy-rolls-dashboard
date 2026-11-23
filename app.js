'use strict';

const el = id => document.getElementById(id);
const make = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const colors = ['#3468b3', '#e9b753', '#a38ee2', '#ed8f77', '#87bbe9', '#d88eba', '#9eb85f', '#65c2ca'];

const overviewStats = [
  ['Total hills pushed', season.hills.reduce((sum, [, count]) => sum + count, 0)],
  ['Buggies rolled', season.dates.reduce((sum, [, count]) => sum + count, 0)],
  ['Pushers', pushers.length],
  ['Ironmans', Object.values(ironmansByPusher).reduce((sum, count) => sum + count, 0)],
];
for (const [name, count] of overviewStats) {
  const stat = make('div', undefined, 'stat');
  stat.append(make('strong', count), make('span', name));
  el('stats').append(stat);
}

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

const rankedPushers = pushers.map(([name, ...counts], index) => ({
  name, index, total: counts.reduce((sum, count) => sum + count, 0),
})).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, undefined, { numeric: true }));
for (const { name, index, total } of rankedPushers.slice(0, 5)) {
  const row = make('li');
  const link = make('a', name);
  link.href = '#pusher-' + index;
  row.append(link, make('strong', total));
  el('leaders').append(row);
}

const selection = el('selection');
const center = 360;
const outerRadius = 340;
const innerRadius = 153;
const origin = -Math.PI / 2;
const tau = Math.PI * 2;

function createBreakdown(container) {
  const layout = make('div', undefined, 'breakdown');
  const wheel = make('div', undefined, 'wheel');
  const details = make('div');
  const title = make('h2');
  const note = make('p', undefined, 'muted');
  const legend = make('ul');
  details.append(title, note, legend);
  layout.append(wheel, details);
  container.append(layout);

  const canvas = make('canvas');
  canvas.width = canvas.height = center * 2;
  canvas.setAttribute('aria-hidden', 'true');
  const tooltip = make('div', undefined, 'slice-tooltip');
  tooltip.setAttribute('aria-hidden', 'true');
  tooltip.hidden = true;
  wheel.append(canvas, tooltip);

  const ctx = canvas.getContext('2d');
  let frame;
  let slices = [];
  let sweepAngle = origin;

  function showSlice(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * canvas.width - center;
    const y = (event.clientY - rect.top) / rect.height * canvas.height - center;
    const radius = Math.hypot(x, y);
    const angle = (Math.atan2(y, x) - origin + tau) % tau + origin;
    const slice = radius >= innerRadius && radius <= outerRadius && angle < sweepAngle
      ? slices.find(part => angle < part.end)
      : undefined;
    tooltip.hidden = !slice;
    if (slice) tooltip.textContent = slice.name + ' · ' + slice.count;
  }

  canvas.addEventListener('pointermove', showSlice);
  canvas.addEventListener('pointerdown', showSlice);
  canvas.addEventListener('pointerleave', () => { tooltip.hidden = true; });
  canvas.addEventListener('pointercancel', () => { tooltip.hidden = true; });

  function draw(total, animate) {
    cancelAnimationFrame(frame);
    tooltip.hidden = true;
    sweepAngle = origin;
    if (!ctx) return;
    const ink = getComputedStyle(wheel).color;
    const start = performance.now();
    const motion = animate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    function paint(now) {
      const progress = motion ? Math.min(1, (now - start) / 650) : 1;
      sweepAngle = origin + tau * (1 - (1 - progress) ** 3);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const part of slices) {
        const revealed = Math.min(part.end, sweepAngle);
        if (revealed <= part.from) break;
        ctx.beginPath();
        ctx.arc(center, center, outerRadius, part.from, revealed);
        ctx.arc(center, center, innerRadius, revealed, part.from, true);
        ctx.closePath();
        ctx.fillStyle = part.color;
        ctx.fill();
      }
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 68px system-ui';
      ctx.fillText(total, center, center);
      if (progress < 1) frame = requestAnimationFrame(paint);
    }
    frame = requestAnimationFrame(paint);
  }

  return function render(label, rows, animate) {
    const total = rows.reduce((sum, [, count]) => sum + count, 0);
    const scale = total || 1;
    let cumulative = 0;
    const parts = rows.map(([name, count, hill], i) => {
      const from = origin + tau * cumulative / scale;
      cumulative += count;
      return {
        name, count, from, end: origin + tau * cumulative / scale,
        color: colors[(hill ?? i) % colors.length],
      };
    });
    slices = parts.filter(part => part.count > 0);
    title.textContent = label;
    note.textContent = total + (total === 1 ? ' assignment' : ' assignments');
    legend.replaceChildren(...parts.map(({ name, count, color }) => {
      const li = make('li');
      const dot = make('span', undefined, 'dot');
      dot.style.background = color;
      li.append(dot, make('span', name), make('strong', count + ' · ' + (100 * count / scale).toFixed(1) + '%'));
      return li;
    }));
    draw(total, animate);
  };
}

const shoveOffs = pushers.map(([name, hill1, hill2, , hill3, hill4]) => [name, hill1 + hill2 + hill3 + hill4]);
const [shoveOffLeader, shoveOffCount] = shoveOffs.reduce((leader, pusher) => pusher[1] > leader[1] ? pusher : leader);
el('shove-off-record').textContent = shoveOffLeader + ' · ' + shoveOffCount;
el('jack-ironmans').textContent = ironmansByPusher.Jack ?? 0;

const driverRows = ['Anika', 'Adrienne', 'Huahua', 'Khadija', 'Ashley'].map(name =>
  [name, rankedPushers.find(pusher => pusher.name === name)?.total ?? 0]
).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const renderDriverChart = createBreakdown(el('driver-chart'));

const hillCharts = season.hills.map(([label], index) => {
  const card = make('article', undefined, 'card');
  el('hill-charts').append(card);
  const render = createBreakdown(card);
  const rows = pushers.map(([name, ...counts]) => [name, counts[index]])
    .filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  return animate => render(label, rows, animate);
});

for (const { name, index, total } of rankedPushers) {
  const option = make('option', name + ' · ' + total);
  option.value = index;
  selection.append(option);
}

const renderPusherChart = createBreakdown(el('pusher-chart'));
const partnerLabels = ['Most received from', 'Most pushes to', 'Most exchanges overall'];

function updatePusher(animate) {
  const index = Number(selection.value);
  const [name, ...counts] = pushers[index];
  el('pusher-ironmans').textContent = ironmansByPusher[name] ?? 0;
  const rows = season.hills.map(([hill], i) => [hill, counts[i], i]).filter(([, count]) => count > 0);
  renderPusherChart(name, rows, animate);
  el('partner-results').replaceChildren(...favoritePartners[index].map((partner, i) => {
    const item = make('div');
    const result = make('dd');
    if (partner) {
      const [otherIndex, count] = partner;
      const link = make('a', pushers[otherIndex][0]);
      link.href = '#pusher-' + otherIndex;
      result.append(link, make('span', ' · ' + count, 'muted'));
    } else {
      result.textContent = 'None logged';
    }
    item.append(make('dt', partnerLabels[i]), result);
    return item;
  }));
}

function renderActive(animate) {
  if (!el('overview').hidden) renderDriverChart('Hills pushed by drivers', driverRows, animate);
  if (!el('explore').hidden) hillCharts.forEach(render => render(animate));
  if (!el('pushers').hidden) updatePusher(animate);
}

function route() {
  const pusherMatch = /^#pusher-(\d+)$/.exec(location.hash);
  const pusherIndex = pusherMatch ? Number(pusherMatch[1]) : -1;
  const showPusher = Boolean(pushers[pusherIndex]);
  const active = location.hash === '#explore' ? 'explore'
    : location.hash === '#pushers' || showPusher ? 'pushers' : 'overview';
  for (const id of ['overview', 'explore', 'pushers']) {
    el(id).hidden = id !== active;
    const link = document.querySelector('nav a[href="#' + id + '"]');
    if (id === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (showPusher) {
    selection.value = pusherIndex;
    window.scrollTo(0, 0);
  }
  renderActive(true);
}

selection.addEventListener('change', () => {
  history.replaceState(null, '', '#pusher-' + selection.value);
  updatePusher(true);
});
window.addEventListener('hashchange', route);

const colorTheme = el('color-theme');
colorTheme.value = document.documentElement.dataset.theme ?? 'system';
colorTheme.addEventListener('change', () => {
  if (colorTheme.value === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = colorTheme.value;
  try {
    localStorage.setItem('rolls-color-theme', colorTheme.value);
  } catch {}
  renderActive(false);
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (colorTheme.value === 'system') renderActive(false);
});
route();

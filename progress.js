'use strict';

const progressChart = document.getElementById('pusher-progress');
const progressLines = document.getElementById('progress-lines');
const progressLegend = document.getElementById('progress-legend');
const replayProgress = document.getElementById('progress-replay');
const reduceProgressMotion = matchMedia('(prefers-reduced-motion: reduce)');
const progressColors = [
  '#487dcc', '#e28038', '#24a388', '#d0618e', '#9c7adc',
  '#b18c24', '#51a4ba', '#db5859', '#6d9a40', '#a5796a',
];
const dates = season.dates.map(([date]) => Date.parse(date));
const plot = { left: 49, right: 722, top: 24, bottom: 271 };
const yMax = Math.ceil(Math.max(...pusherProgress.map(([, counts]) => counts.at(-1))) / 20) * 20;
const xFor = date => plot.left + (plot.right - plot.left) * (date - dates[0]) / (dates.at(-1) - dates[0]);
const yFor = count => plot.bottom - (plot.bottom - plot.top) * count / yMax;

function chartNode(tag, attributes, parent, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  parent.append(node);
  return node;
}

const axes = document.getElementById('progress-axes');
for (let tick = 0; tick <= yMax; tick += 20) {
  const y = yFor(tick);
  chartNode('line', { x1: plot.left, x2: plot.right, y1: y, y2: y, class: 'progress-grid' }, axes);
  chartNode('text', { x: plot.left - 9, y, 'text-anchor': 'end', 'dominant-baseline': 'middle' }, axes, tick);
}
for (const index of [0, Math.floor(dates.length / 2), dates.length - 1]) {
  const anchor = index === 0 ? 'start' : index === dates.length - 1 ? 'end' : 'middle';
  chartNode('text', { x: xFor(dates[index]), y: 304, 'text-anchor': anchor }, axes, dateFormat.format(dates[index]));
}

pusherProgress.forEach(([pusherIndex, counts], index) => {
  const [name] = pushers[pusherIndex];
  const color = progressColors[index];
  const last = counts.at(-1);
  const points = counts.map((count, day) => xFor(dates[day]) + ',' + yFor(count)).join(' ');
  const line = chartNode('polyline', { points, stroke: color, class: 'progress-line' }, progressLines);
  chartNode('title', {}, line, name + ' · ' + last + ' hill assignments');
  chartNode('circle', { cx: plot.right, cy: yFor(last), r: 4, fill: color }, progressLines);

  const item = make('li');
  const swatch = make('span', undefined, 'dot');
  swatch.style.background = color;
  swatch.setAttribute('aria-hidden', 'true');
  const link = make('a', name);
  link.href = '#pusher-' + pusherIndex;
  item.append(swatch, link, make('strong', last));
  progressLegend.append(item);
});

let sweep;
function playProgress() {
  sweep?.cancel();
  if (reduceProgressMotion.matches) return;
  sweep = progressLines.animate(
    [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }],
    { duration: 2200, easing: 'linear' },
  );
}

function updateReplay() {
  replayProgress.hidden = reduceProgressMotion.matches;
  if (reduceProgressMotion.matches) sweep?.cancel();
}
updateReplay();
reduceProgressMotion.addEventListener('change', updateReplay);
replayProgress.addEventListener('click', playProgress);
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    playProgress();
    observer.disconnect();
  }, { threshold: 0.2 });
  observer.observe(progressChart);
}

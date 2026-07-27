const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));

const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
const didItDays = entries.filter(([, v]) => v.did_it).length;

let currentStreak = 0;
let bestStreak = 0;
let tempStreak = 0;
for (let i = entries.length - 1; i >= 0; i--) {
  if (entries[i][1].did_it) {
    tempStreak++;
    if (currentStreak === 0) currentStreak = tempStreak;
  } else {
    bestStreak = Math.max(bestStreak, tempStreak);
    tempStreak = 0;
  }
}
bestStreak = Math.max(bestStreak, tempStreak);

function formatForWhat(str) {
  return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const forWhatMap = {};
entries.forEach(([, v]) => {
  if (v.did_it && v.for_what) {
    forWhatMap[v.for_what] = (forWhatMap[v.for_what] || 0) + 1;
  }
});
const topForWhat = Object.entries(forWhatMap).sort(([, a], [, b]) => b - a)[0];

function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const today = new Date();
today.setHours(12, 0, 0, 0);
const startDate = new Date(today);
startDate.setDate(startDate.getDate() - 364);

const dateMap = {};
entries.forEach(([date, v]) => { dateMap[date] = v; });

const cellSize = 12;
const cellGap = 3;
const cellStep = cellSize + cellGap;
const offsetX = 40;
const offsetY = 50;
const cols = 53;
const rows = 7;

const svgWidth = offsetX + cols * cellStep + 16;
const svgHeight = offsetY + rows * cellStep + 36;

let heatmapSvg = '';

const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];
dayLabels.forEach((label, i) => {
  if (label) {
    const y = offsetY + i * cellStep + 10;
    heatmapSvg += `<text x="28" y="${y}" fill="#8b949e" font-family="monospace" font-size="9" text-anchor="end">${label}</text>`;
  }
});

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let lastMonth = -1;
let d = new Date(startDate);
for (let col = 0; col < cols; col++) {
  const month = d.getMonth();
  if (month !== lastMonth) {
    const x = offsetX + col * cellStep;
    heatmapSvg += `<text x="${x}" y="${offsetY - 6}" fill="#8b949e" font-family="monospace" font-size="9">${monthNames[month]}</text>`;
    lastMonth = month;
  }
  for (let row = 0; row < rows; row++) {
    const dateStr = toLocalDateStr(d);
    const x = offsetX + col * cellStep;
    const y = offsetY + row * cellStep;
    const entry = dateMap[dateStr];

    if (entry && entry.did_it) {
      const times = entry.times || 1;
      let opacity;
      if (times >= 4) opacity = 1;
      else if (times === 3) opacity = 0.8;
      else if (times === 2) opacity = 0.6;
      else opacity = 0.4;
      heatmapSvg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="#2ea043" opacity="${opacity}"/>`;
    } else {
      heatmapSvg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="#161b22" stroke="#21262d" stroke-width="1"/>`;
    }
    d.setDate(d.getDate() + 1);
  }
}

const legendY = svgHeight - 20;
const legendBaseX = svgWidth - 152;
const legendItems = [
  { label: '0', opacity: null, stroke: true },
  { label: '1', opacity: 0.4 },
  { label: '2', opacity: 0.6 },
  { label: '3', opacity: 0.8 },
  { label: '4+', opacity: 1 }
];

let legendSvg = '';
legendItems.forEach((item, i) => {
  const x = legendBaseX + i * 24;
  const fill = item.stroke ? '#161b22' : '#2ea043';
  const stroke = item.stroke ? 'stroke="#21262d" stroke-width="1"' : '';
  const opacity = item.opacity !== null ? `opacity="${item.opacity}"` : '';
  legendSvg += `<rect x="${x}" y="${legendY}" width="10" height="10" rx="2" fill="${fill}" ${opacity} ${stroke}/>`;
  legendSvg += `<text x="${x + 14}" y="${legendY + 9}" fill="#8b949e" font-family="monospace" font-size="9">${item.label}</text>`;
});

const titleText = 'nutracker';
const statsText = `${didItDays} nuts in the last year`;
const topText = topForWhat ? `top: ${formatForWhat(topForWhat[0])} (${topForWhat[1]}x)` : '';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <rect width="${svgWidth}" height="${svgHeight}" fill="#0d1117" rx="8"/>

  <text x="16" y="28" fill="#f0f6fc" font-family="monospace" font-size="14" font-weight="bold">${titleText}</text>
  <text x="110" y="28" fill="#8b949e" font-family="monospace" font-size="11">${statsText}</text>
  ${topText ? `<text x="${svgWidth - 16}" y="28" fill="#8b949e" font-family="monospace" font-size="10" text-anchor="end">${topText}</text>` : ''}

  ${heatmapSvg}

  ${legendSvg}
</svg>`;

fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'output', 'tracker.svg'), svg);
console.log('SVG generated successfully!');

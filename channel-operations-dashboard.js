const colors = {
  whatsapp: '#09a978',
  email: '#2466ff',
  sms: '#ff8a00',
  voice: '#8b3cff',
  webpush: '#13b8d2',
  inapp: '#ff3f62'
};

const sparkData = {
  whatsapp: [52, 58, 55, 62, 59, 64, 61, 66, 63, 69, 65, 71, 67, 73, 69, 76, 70, 74, 72, 79, 86],
  email: [44, 50, 47, 53, 49, 55, 51, 59, 52, 57, 54, 62, 58, 56, 60, 55, 59, 54, 57, 53, 58],
  sms: [39, 45, 42, 48, 43, 46, 41, 49, 44, 47, 43, 50, 45, 48, 44, 47, 42, 46, 41, 45, 43],
  voice: [35, 42, 38, 45, 40, 43, 39, 44, 41, 46, 42, 45, 40, 43, 39, 42, 38, 41, 37, 40, 39],
  webpush: [24, 31, 28, 37, 33, 45, 36, 39, 34, 41, 38, 44, 37, 43, 39, 46, 40, 45, 38, 44, 41],
  inapp: [48, 43, 46, 39, 44, 38, 42, 36, 40, 35, 39, 34, 37, 33, 36, 31, 35, 30, 34, 29, 33]
};

function points(values, width = 170, height = 28, pad = 2) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values.map((value, index) => {
    const x = pad + index * ((width - pad * 2) / (values.length - 1));
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

document.querySelectorAll('[data-spark]').forEach((svg) => {
  const key = svg.dataset.spark;
  svg.setAttribute('viewBox', '0 0 170 28');
  svg.innerHTML = `<polyline class="spark-line" style="--c:${colors[key]}" points="${points(sparkData[key])}"/><circle class="spark-dot" style="--c:${colors[key]}" cx="166" cy="${points(sparkData[key]).split(' ').at(-1).split(',')[1]}" r="2"/>`;
});

function drawVolumeTrend() {
  const host = document.querySelector('[data-chart="volume"]');
  if (!host) return;

  const w = 720;
  const h = 170;
  const left = 42;
  const right = 18;
  const top = 10;
  const bottom = 26;
  const labels = ['May 27', 'May 28', 'May 29', 'May 30', 'May 31', 'Jun 01', 'Jun 02'];
  const ticks = [0, 2, 4, 6, 8, 10];
  const series = {
    green: [6.9, 7.8, 7.5, 8.5, 8.7, 7.9, 8.5],
    blue: [3.4, 3.8, 3.4, 3.7, 3.7, 3.5, 3.6],
    orange: [2.0, 2.2, 2.0, 2.4, 2.3, 2.2, 2.2],
    purple: [0.44, 0.48, 0.45, 0.51, 0.49, 0.46, 0.50],
    cyan: [0.95, 1.05, 1.0, 1.12, 1.09, 1.02, 1.10],
    red: [0.40, 0.46, 0.43, 0.51, 0.48, 0.45, 0.50]
  };

  const x = (index) => left + index * ((w - left - right) / (labels.length - 1));
  const y = (value) => top + (10 - value) / 10 * (h - top - bottom);
  const grids = ticks.map((tick) => `<line class="gridline" x1="${left}" y1="${y(tick)}" x2="${w - right}" y2="${y(tick)}"/><text x="8" y="${y(tick) + 3}">${tick}M</text>`).join('');
  const dates = labels.map((label, index) => `<text x="${x(index) - 16}" y="${h - 5}">${label}</text>`).join('');
  const lines = Object.entries(series).map(([key, values]) => `<polyline class="${key}-line" points="${values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ')}"/>`).join('');

  host.innerHTML = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Channel volume trend chart">${grids}${lines}${dates}</svg>`;
}

drawVolumeTrend();

const dialog = document.getElementById('channel-dialog');
document.querySelectorAll('.panel-heading button,.actions button').forEach((button) => {
  button.addEventListener('click', () => {
    if (!dialog) return;
    dialog.querySelector('h2').textContent = button.textContent.trim();
    dialog.querySelector('.dialog-body').textContent = 'Channel operations controls are ready for product wiring.';
    dialog.showModal();
  });
});

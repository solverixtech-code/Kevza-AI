const colors = { blue: '#2466ff', green: '#09a978', purple: '#8b3cff', orange: '#ff8a00', red: '#ff3f62', cyan: '#13b8d2' };
const sparkData = {
  blue: [42,49,46,53,48,57,51,61,54,47,56,50,59,52,63,55,49,58,46,54,60],
  green: [55,58,56,61,59,65,60,67,63,62,66,64,69,68,72,70,74,71,75,73,77],
  purple: [31,37,34,43,39,46,41,52,47,44,51,48,55,50,46,53,49,57,51,45,54],
  orange: [62,60,64,61,67,63,69,66,70,68,72,69,74,71,76,72,75,73,78,74,79],
  cyan: [22,29,26,34,31,38,35,43,39,37,45,41,48,44,50,47,52,49,55,51,58],
  red: [58,54,56,49,52,46,50,43,47,41,45,38,42,36,39,34,37,31,35,28,32]
};
function points(values, width = 170, height = 28, pad = 2) {
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  return values.map((value, index) => {
    const x = pad + index * ((width - pad * 2) / (values.length - 1));
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
document.querySelectorAll('[data-spark]').forEach(svg => {
  const key = svg.dataset.spark;
  svg.setAttribute('viewBox', '0 0 170 28');
  svg.innerHTML = `<polyline class="spark-line" style="--c:${colors[key]}" points="${points(sparkData[key])}"/>`;
});
function drawTraffic() {
  const host = document.querySelector('[data-chart="traffic"]');
  if (!host) return;
  const w = 620, h = 170, left = 45, right = 16, top = 12, bottom = 26;
  const series = {
    green: [6.8,7.4,7.9,7.5,8.3,8.9,8.5],
    blue: [4.2,4.7,4.5,5.1,5.2,4.8,5.0],
    orange: [2.1,2.3,2.0,2.5,2.6,2.2,2.4],
    purple: [.6,.7,.65,.74,.71,.8,.76]
  };
  const labels = ['May 27','May 28','May 29','May 30','May 31','Jun 01','Jun 02'];
  const ticks = [0,2,4,6,8,10];
  const x = i => left + i * ((w - left - right) / (labels.length - 1));
  const y = v => top + (10 - v) / 10 * (h - top - bottom);
  const grids = ticks.map(t => `<line class="gridline" x1="${left}" y1="${y(t)}" x2="${w-right}" y2="${y(t)}"/><text x="10" y="${y(t)+3}">${t}M</text>`).join('');
  const dates = labels.map((label,i) => `<text x="${x(i)-14}" y="${h-5}">${label}</text>`).join('');
  const lines = Object.entries(series).map(([key, values]) => `<polyline class="${key}-line" points="${values.map((v,i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`).join('');
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Channel traffic trend chart">${grids}${lines}${dates}</svg>`;
}
drawTraffic();
const dialog = document.getElementById('channel-dialog');
document.querySelectorAll('.panel-heading button,.quick-actions button').forEach(button => {
  button.addEventListener('click', () => {
    if (!dialog) return;
    dialog.querySelector('h2').textContent = button.textContent.trim();
    dialog.querySelector('.dialog-body').textContent = 'Channel operations controls are ready for product wiring.';
    dialog.showModal();
  });
});

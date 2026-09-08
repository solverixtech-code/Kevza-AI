const colors = { blue: '#2466ff', green: '#09a978', purple: '#8b3cff', orange: '#ff8a00', red: '#ff3f62', cyan: '#13b8d2' };
const sparkData = {
  blue: [36,45,42,51,47,58,44,62,55,49,57,46,53,59,48,54,50,61,55,47,52],
  green: [42,44,48,51,47,56,50,58,52,55,49,46,51,55,57,52,49,47,53,58,61],
  purple: [33,38,35,41,39,47,42,36,45,50,44,39,48,46,41,52,49,43,46,54,50],
  orange: [24,31,36,33,41,38,30,44,47,39,35,43,48,41,37,45,52,46,40,48,51],
  red: [31,36,39,34,42,38,44,35,41,45,37,43,40,35,39,33,42,37,31,35,28],
  cyan: [22,26,24,32,29,34,31,37,35,30,36,33,39,41,36,44,40,43,38,45,42]
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
function drawMrrTrend() {
  const host = document.querySelector('[data-chart="mrr"]');
  if (!host) return;
  const w = 620, h = 170, left = 45, right = 16, top = 12, bottom = 26;
  const values = [20, 28, 30, 38, 40, 46, 50];
  const labels = ['May 27','May 28','May 29','May 30','May 31','Jun 01','Jun 02'];
  const ticks = [0,10,20,30,40,50];
  const min = 0, max = 50;
  const x = i => left + i * ((w - left - right) / (values.length - 1));
  const y = v => top + (max - v) / (max - min) * (h - top - bottom);
  const line = values.map((v,i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${left},${y(0)} ${line} ${x(values.length - 1)},${y(0)}`;
  const grids = ticks.map(t => `<line class="gridline" x1="${left}" y1="${y(t)}" x2="${w-right}" y2="${y(t)}"/><text x="8" y="${y(t)+3}">₹${t}L</text>`).join('');
  const dates = labels.map((label,i) => `<text x="${x(i)-14}" y="${h-5}">${label}</text>`).join('');
  const dots = values.map((v,i) => `<circle class="dot" cx="${x(i)}" cy="${y(v)}" r="3"/>`).join('');
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="MRR trend chart"><defs><linearGradient id="mrrArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2466ff" stop-opacity=".18"/><stop offset="1" stop-color="#2466ff" stop-opacity="0"/></linearGradient></defs>${grids}<polygon class="area" points="${area}"/><polyline class="mrr-line" points="${line}"/>${dots}${dates}</svg>`;
}
drawMrrTrend();
const dialog = document.getElementById('subscription-dialog');
document.querySelectorAll('.panel-heading button,.quick-action').forEach(button => {
  button.addEventListener('click', () => {
    if (!dialog) return;
    dialog.querySelector('h2').textContent = button.textContent.trim();
    dialog.querySelector('.dialog-body').textContent = 'Subscription reporting controls are ready for product wiring.';
    dialog.showModal();
  });
});

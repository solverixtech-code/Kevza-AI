const colors = { blue:'#2466ff', green:'#0faf79', purple:'#8b3cff', orange:'#ff8a00', cyan:'#13b8d2', red:'#ff3f62' };
const sparkData = {
  green:[12,18,15,20,17,22,18,19,27,18,16,14,18,21,28,24,19,16],
  blue:[18,24,21,27,22,25,20,18,23,29,24,20,18,23,28,25,20,17],
  purple:[19,22,18,21,20,24,19,21,17,22,18,20,24,21,18,16,20,18],
  orange:[14,20,18,21,26,17,15,19,22,16,14,19,24,20,17,14,18,15],
  cyan:[16,18,24,22,26,20,19,23,16,19,24,21,18,16,20,17,15,18],
  red:[18,17,19,16,21,18,17,20,18,16,15,14,17,16,15,14,13,12]
};
function points(data,w,h,pad=2){const max=Math.max(...data),min=Math.min(...data),range=max-min||1;return data.map((v,i)=>`${pad+i*(w-pad*2)/(data.length-1)},${h-pad-((v-min)/range)*(h-pad*2)}`).join(' ')}
document.querySelectorAll('[data-spark]').forEach(svg=>{const key=svg.dataset.spark;const w=150,h=28;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.style.setProperty('--c',colors[key]);svg.innerHTML=`<polyline class="spark-line" points="${points(sparkData[key],w,h)}"></polyline>`});
function lineChart(el,series){const w=360,h=148,p={l:34,r:10,t:12,b:24};const all=series.flatMap(s=>s.data),max=Math.max(...all),min=Math.min(...all);const sx=i=>p.l+i*(w-p.l-p.r)/(series[0].data.length-1);const sy=v=>h-p.b-((v-min)/(max-min||1))*(h-p.t-p.b);let grid='';for(let i=0;i<4;i++){const y=p.t+i*(h-p.t-p.b)/3;grid+=`<line class="grid" x1="${p.l}" y1="${y}" x2="${w-p.r}" y2="${y}"></line>`}const lines=series.map(s=>`<polyline class="${s.className}" points="${s.data.map((v,i)=>`${sx(i)},${sy(v)}`).join(' ')}"></polyline>`).join('');const labels=['03:19 PM','03:20 PM','03:21 PM','03:22 PM','03:23 PM','03:24 PM'].map((d,i)=>`<text x="${sx(i)}" y="${h-5}" text-anchor="middle">${d}</text>`).join('');el.innerHTML=`<svg class="chart" viewBox="0 0 ${w} ${h}">${grid}${lines}${labels}<text x="2" y="20">10K</text><text x="8" y="58">8K</text><text x="8" y="96">6K</text><text x="8" y="132">4K</text></svg>`}
const flow=document.querySelector('[data-chart="message-flow"]');
if(flow){lineChart(flow,[{className:'sent',data:[5100,6500,7200,6900,6200,5800,6600,8200,7600,6900]},{className:'delivered',data:[3400,4100,4500,4600,4400,4200,4900,6100,5400,4800]},{className:'failed',data:[850,1100,1400,1200,900,1050,800,1250,970,760]}]);}
const dialog=document.getElementById('live-dialog');
document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{if(!dialog)return;dialog.querySelector('h2').textContent=button.dataset.panel.replace(/\b\w/g,c=>c.toUpperCase());dialog.querySelector('.dialog-body').innerHTML='<p>This live operations detail panel is ready for wiring to real-time data.</p>';dialog.showModal();}));
document.querySelector('.menu-toggle')?.addEventListener('click',()=>document.querySelector('.live-shell')?.classList.toggle('menu-open'));

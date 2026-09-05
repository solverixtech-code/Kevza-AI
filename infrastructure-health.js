const chartData = {
  uptime: { values: [99.79,99.88,99.81,99.68,99.88,99.67,99.79,99.87,99.74], min:99.5,max:100,labels:['100%','99.9%','99.8%','99.7%','99.6%','99.5%'] },
  performance: { values:[184,192,201,195,203,164,173], min:0,max:400,labels:['400 ms','300 ms','200 ms','100 ms','0 ms'] }
};
function renderChart(element, days=7) {
 const data=chartData[element.dataset.chart], width=420, height=175, left=40, right=12, top=10, bottom=28;
 const plotWidth=width-left-right, plotHeight=height-top-bottom;
 const values=data.values;
 const points=values.map((v,i)=>[left+i*plotWidth/(values.length-1),top+(data.max-v)/(data.max-data.min)*plotHeight]);
 const dates=Array.from({length:7},(_,i)=>{const date=new Date(Date.UTC(2024,5,2));date.setUTCDate(date.getUTCDate()-Math.round((6-i)*(days-1)/6));return date.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});});
 element.innerHTML='<svg class="line-chart" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" role="img" aria-label="'+(element.dataset.chart==='uptime'?'System uptime':'Average response time')+' trend, '+days+' days">'+
 data.labels.map((label,i)=>{const y=top+i*plotHeight/(data.labels.length-1);return '<line class="grid" x1="'+left+'" y1="'+y+'" x2="'+(width-right)+'" y2="'+y+'"/><text x="0" y="'+(y+3)+'">'+label+'</text>';}).join('')+
 '<polyline class="series" points="'+points.map(p=>p.join(',')).join(' ')+'"/>'+points.map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="2.7" fill="#3458ff"><title>'+values[i]+(element.dataset.chart==='uptime'?'%':' ms')+'</title></circle>').join('')+
 dates.map((date,i)=>'<text text-anchor="middle" x="'+(left+i*plotWidth/6)+'" y="'+(height-8)+'">'+date+'</text>').join('')+'</svg>';
}
document.querySelectorAll('[data-chart]').forEach(el=>renderChart(el));
document.querySelectorAll('.range button').forEach(button=>button.addEventListener('click',()=>{
 button.parentElement.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
 renderChart(button.closest('.panel').querySelector('[data-chart]'),Number(button.dataset.days));
}));
const dialog=document.querySelector('#details-dialog');
function openDetails(title, content) {
 dialog.querySelector('h2').textContent=title;
 dialog.querySelector('.dialog-body').replaceChildren(content);
 dialog.showModal();
}
document.querySelectorAll('[data-details]').forEach(button=>button.addEventListener('click',()=>{
 const panel=button.closest('.panel');
 openDetails(panel.querySelector('h2').textContent,panel.querySelector('table,.system-info').cloneNode(true));
}));
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>{
 const panel=[...document.querySelectorAll('.panel')].find(p=>p.querySelector('h2').textContent===button.dataset.open);
 const content=panel?panel.querySelector('table').cloneNode(true):document.createElement('p');
 if(!panel)content.textContent='Use the search box to filter services, select a chart period, or open a report for more detail. This dashboard displays the reference sample data.';
 openDetails(button.dataset.open,content);
}));
const search=document.querySelector('.search input');
search.addEventListener('input',()=>{
 let count=0;
 document.querySelectorAll('#services tbody tr').forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(search.value.toLowerCase());if(!row.hidden)count++;});
 document.querySelector('#search-empty').hidden=count>0;
});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='k'){event.preventDefault();search.focus();}});
document.querySelector('.menu-toggle').addEventListener('click',event=>{
 const open=document.querySelector('.admin-app').classList.toggle('menu-open');
 event.currentTarget.setAttribute('aria-expanded',String(open));
});
document.querySelector('.main').addEventListener('click',event=>{
 if(!event.target.closest('.menu-toggle')){document.querySelector('.admin-app').classList.remove('menu-open');document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');}
});
document.querySelector('select').addEventListener('change',event=>{
 document.querySelectorAll('.comparison').forEach(el=>el.hidden=event.target.selectedIndex===1);
});
document.querySelector('#date-range').addEventListener('click',()=>{
 const form=document.createElement('form');
 form.innerHTML='<label>Start date <input class="control" type="date" name="start" value="2024-05-27" required></label> <label>End date <input class="control" type="date" name="end" value="2024-06-02" required></label><p><button class="control" type="submit">Apply dates</button></p>';
 form.addEventListener('submit',event=>{
 event.preventDefault();
 const start=form.elements.start.value, end=form.elements.end.value;
 form.elements.end.setCustomValidity(end<start?'End date must be after the start date.':'');
 if(!form.reportValidity())return;
 const format=value=>new Date(value+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'});
 document.querySelector('#date-range').textContent=format(start)+' - '+format(end)+'　 ▣';
 dialog.close();
 });
 form.elements.end.addEventListener('input',()=>form.elements.end.setCustomValidity(''));
 openDetails('Select date range',form);
});
let autoRefresh=true;
document.querySelector('.refresh').addEventListener('click',event=>{
 autoRefresh=!autoRefresh;
 event.currentTarget.textContent=autoRefresh?'⟳　Auto refresh: 30s':'⟳　Auto refresh: paused';
 event.currentTarget.setAttribute('aria-pressed',String(autoRefresh));
});
setInterval(()=>{if(autoRefresh){const time=document.querySelector('#updated');time.dateTime=new Date().toISOString();time.textContent=new Date().toLocaleString('en-US',{month:'short',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}},30000);


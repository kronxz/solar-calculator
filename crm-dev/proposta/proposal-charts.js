export function renderEconomyChart(canvasId, data){
  const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  if(typeof Chart === 'undefined'){
    // draw a simple fallback bar chart
    ctx.fillStyle='#e2e8f0'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#2563eb'; ctx.fillRect(20,20,canvas.width-40,canvas.height-40);
    return;
  }
  const labels = data.years.map(y=>String(y));
  const values = data.savings;
  if (canvas._chartInstance){
    canvas._chartInstance.data.labels = labels; canvas._chartInstance.data.datasets[0].data = values; canvas._chartInstance.update(); return;
  }
  canvas._chartInstance = new Chart(ctx,{
    type:'line', data:{labels, datasets:[{label:'Economia', data:values, borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.12)', fill:true}]}, options:{responsive:true}
  });
}
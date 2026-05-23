export async function exportPdf(){
  const root = document.getElementById('proposal-root');
  if(!root || typeof html2pdf === 'undefined'){
    return window.print();
  }

  const clone = root.cloneNode(true);
  clone.style.width = '794px';
  clone.style.maxWidth = '794px';
  const actions = clone.querySelector('.proposal-actions');
  if(actions) actions.remove();

  const opt = {
    margin: [12, 12, 12, 12],
    filename: `proposta-${Date.now()}.pdf`,
    image: { type: 'png', quality: 1.0 },
    html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff', imageTimeout: 20000, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  try {
    await html2pdf().set(opt).from(clone).save();
  } catch (error) {
    console.error('html2pdf export failed', error);
    window.print();
  }
}

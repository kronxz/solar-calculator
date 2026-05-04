const puppeteer = require('puppeteer');

async function gerarPDF() {

  const browser = await puppeteer.launch({
    headless: "new"
  });

  const page = await browser.newPage();

  await page.goto('file://' + __dirname + '/proposta.html', {
    waitUntil: 'networkidle0'
  });

  await page.pdf({
    path: 'proposta.pdf',
    format: 'A4',
    printBackground: true
  });

  await browser.close();

  console.log("PDF gerado com sucesso!");
}

gerarPDF();
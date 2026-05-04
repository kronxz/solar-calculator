const express = require('express')
const puppeteer = require('puppeteer')
const path = require('path')

const app = express()
const cors = require('cors')
app.use(cors())

app.use(express.json())

// 🔥 ISSO AQUI É O QUE FALTAVA
app.use(express.static(__dirname))

// ROTA PDF
app.post('/gerar-pdf', async (req, res) => {

  const dados = req.body

  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto('file://' + path.join(__dirname, 'proposta.html'), {
    waitUntil: 'networkidle0'
  })

  await page.evaluate((dados) => {
    localStorage.setItem('dadosProposta', JSON.stringify(dados))
  }, dados)

  await page.reload({ waitUntil: 'networkidle0' })

  await page.pdf({
    path: 'proposta.pdf',
    format: 'A4',
    printBackground: true
  })

  await browser.close()

  res.send('PDF gerado com sucesso!')
})

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000')
})
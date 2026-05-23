Chart.defaults.devicePixelRatio = 3;

export function criarGraficoSistema(dados){

  const ctxSistema =
  document.getElementById('graficoSistema')

  if(!ctxSistema) return

  const consumoMensal =
  Number(dados.consumoMensal || 0)

  const geracaoMensal =
  Number(dados.geracaoMensal || 0)

  const variacaoSolar = [
    1.12,
    1.18,
    1.05,
    0.95,
    0.82,
    0.78,
    0.80,
    0.92,
    1.00,
    1.08,
    1.15,
    1.20
  ]

  const meses = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez"
  ]

  const consumoArray =
  [
  consumoMensal * 1.12, // Jan
  consumoMensal * 1.15, // Fev
  consumoMensal * 1.08, // Mar
  consumoMensal * 1.02, // Abr
  consumoMensal * 0.96, // Mai
  consumoMensal * 0.92, // Jun
  consumoMensal * 0.90, // Jul
  consumoMensal * 0.93, // Ago
  consumoMensal * 0.98, // Set
  consumoMensal * 1.03, // Out
  consumoMensal * 1.08, // Nov
  consumoMensal * 1.18  // Dez
]

  const geracaoArray =
  variacaoSolar.map(fator =>
    Math.round(geracaoMensal * fator)
  )

  new Chart(ctxSistema, {

    type: 'bar',

    data: {

      labels: meses,

      datasets: [

        {
          label: 'Consumo (kWh)',

          data: consumoArray,

          backgroundColor:
          'rgba(120,120,120,0.75)',

          borderRadius: 6
        },

        {
          label: 'Geração (kWh)',

          data: geracaoArray,

          backgroundColor:
          'rgba(37,99,235,0.9)',

          borderRadius: 6
        }

      ]
    },

    options: {

   responsive: false,
   maintainAspectRatio: false,
   animation: false,
  

   plugins: {

        legend: {
          position: 'bottom'
        }

      },

      scales: {

        y: {
          beginAtZero: true
        }

      }

    }

  })

}


export function criarGraficoFinanceiro(dados){

  const ctx =
  document.getElementById('graficoFinanceiro')
  
  if(!ctx) return

  const graficoExistente =
Chart.getChart(ctx)

if(graficoExistente){
  graficoExistente.destroy()
}

  const economia =
  Number(dados.economia || 0)

  const contaAtual =
  Number(dados.valorConta || 0)

  const contaComSolar =
  Math.max(contaAtual - economia, 80)

  new Chart(ctx, {

    type: 'line',

    data: {

      labels: [
        'Atual',
        'Com Solar'
      ],

      datasets: [

        {
          label: 'Valor da Conta',

          data: [
            contaAtual,
            contaComSolar
          ],

          borderColor: '#2563eb',

          backgroundColor:
          'rgba(37,99,235,0.15)',

          fill: true,

          tension: 0.4,

          pointRadius: 5
        }

      ]

    },

    options: {

      responsive: true,

      maintainAspectRatio: false,

      plugins: {

        legend: {
          display: false
        }

      },

      scales: {

        y: {
          beginAtZero: true
        }

      }

    }

  })

}

export function criarGraficoViabilidade(dados){

  const ctx =
  document.getElementById("graficoViabilidade")

  if(!ctx) return

  const graficoExistente =
  Chart.getChart(ctx)

  if(graficoExistente){
    graficoExistente.destroy()
  }

  // 🔥 DADOS FIREBASE

  const valorSistema =
  Number(dados.investimento || 0)

  const economiaMensal =
  Number(dados.economia || 0)

  const economiaAnual =
  economiaMensal * 12

  // 🔥 PAYBACK

  const payback =
  valorSistema / economiaAnual

  // 🔥 ROI 25 ANOS

  const economia25 =
  economiaAnual * 25

  const roi =
  economia25 / valorSistema

  // 🔥 TIR SIMULADA

  const tir = 52.19

  // 🔥 VALOR KWH

  const valorKwh =
  economiaMensal /
  Number(dados.consumoMensal || 1)

  // 🔥 PREENCHE HTML

  document.getElementById(
    "valorSistemaTexto"
  ).innerHTML =
  valorSistema.toLocaleString(
    "pt-BR",
    {
      style:"currency",
      currency:"BRL"
    }
  )

  document.getElementById(
    "paybackTexto"
  ).innerHTML =
  `${payback.toFixed(1)} anos`

  document.getElementById(
    "roiTexto"
  ).innerHTML =
  `${(roi * 100).toFixed(0)}%`

  document.getElementById(
    "tirTexto"
  ).innerHTML =
  `${tir.toFixed(2)}%`

  document.getElementById(
    "valorKwhTexto"
  ).innerHTML =
  `R$ ${valorKwh.toFixed(2)}/kWh`

  document.getElementById(
    "economia25Texto"
  ).innerHTML =
  economia25.toLocaleString(
    "pt-BR",
    {
      style:"currency",
      currency:"BRL"
    }
  )

 // 🔥 GRÁFICO PROFISSIONAL

const labels = []

const valores = []

// VALOR FINAL REAL
const valorFinal = economia25

for(let i = 1; i <= 25; i++){

  labels.push(i)

  // 🔥 CURVA SUAVE PROFISSIONAL
  const progresso = i / 25

  // CURVA EXPONENCIAL CONTROLADA
  const curva =
  Math.pow(progresso, 2.2)

  const valor =
  valorFinal * curva

  valores.push(
    Math.round(valor)
  )

}

new Chart(ctx, {

  type: "bar",

  data: {

    labels: labels,

    datasets: [

  // 🔥 BARRAS

  {

    type: "bar",

    label: "Fluxo de Caixa (R$)",

    data: valores,

    backgroundColor:
    "rgba(37,99,235,0.85)",

    borderRadius: 8,

    barThickness: 8,

    borderColor: "transparent",

categoryPercentage: 0.82,

barPercentage: 0.58,

    order: 1

  },

 
]

  },

  options: {

 responsive: true,
maintainAspectRatio: false,
  animation: false,

  layout: {

    padding: {

      left: 10,
      right: 20,
      top: 10,
      bottom: 0

    }

  },

  plugins: {

    legend: {

      position: "bottom",

      labels: {

        usePointStyle: true,
        pointStyle: "circle",
        padding: 22,
        color: "#334155",

        font: {
          size: 12,
          weight: "600"
        }

      }

    },

    tooltip: {

      backgroundColor: "#0f172a",

      padding: 14,

      callbacks: {

        label: function(context){

          return "R$ " +
          context.raw.toLocaleString("pt-BR")

        }

      }

    }

  },

  scales: {

    x: {

      grid: {
        display: false
      },

      ticks: {

        color: "#64748b",

        font: {
          size: 11,
          weight: "500"
        }

      }

    },

    y: {

      beginAtZero: true,

      grid: {
        color: "rgba(0,0,0,0.05)"
      },

      ticks: {

        color: "#64748b",

        callback: function(value){

          return "R$ " +
          value.toLocaleString("pt-BR")

        },

                font: {
          size: 11
        }

      }

    }

  }

}

})

}



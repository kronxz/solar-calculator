Chart.defaults.devicePixelRatio = 3;

export function criarGraficoFinanceiro(dados){

  const ctx =
  document.getElementById("graficoFinanceiro")

  if(!ctx) return

  const graficoExistente =
Chart.getChart(ctx)

if(graficoExistente){
  graficoExistente.destroy()
}

  const valorConta =
  Number(dados.valorConta || 0)

  const economia =
  Number(dados.economiaMensal || 0)

  const contaComSistema =
  valorConta - economia

  const valorSemSistema =
  Math.round(valorConta)

  const valorComSistema =
  Math.max(
  Math.round(contaComSistema),
  250
)
  
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez"
  ]

const semSistema = [
  valorSemSistema * 1.12,
  valorSemSistema * 1.15,
  valorSemSistema * 1.10,
  valorSemSistema * 1.08,
  valorSemSistema * 1.05,
  valorSemSistema * 1.02,
  valorSemSistema * 1.00,
  valorSemSistema * 1.03,
  valorSemSistema * 1.06,
  valorSemSistema * 1.08,
  valorSemSistema * 1.10,
  valorSemSistema * 1.14
]

const comSistema = [
  valorComSistema * 1.10,
  valorComSistema * 1.12,
  valorComSistema * 1.08,
  valorComSistema * 1.05,
  valorComSistema * 1.02,
  valorComSistema * 1.00,
  valorComSistema * 0.98,
  valorComSistema * 1.00,
  valorComSistema * 1.03,
  valorComSistema * 1.05,
  valorComSistema * 1.08,
  valorComSistema * 1.10
]

  new Chart(ctx, {

    type: "bar",

    data: {

      labels: meses,

      datasets: [

        {
          label: "Valor COM Sistema (R$)",

          data: comSistema,

          backgroundColor:
          "rgba(37,99,235,0.95)",

          borderRadius: 4,

          barThickness: 18
        },

        {
          label: "Valor SEM Sistema (R$)",

          data: semSistema,

          backgroundColor:
          "rgba(140,140,140,0.75)",

          borderRadius: 4,

          barThickness: 12
        }

      ]
    },

   options: {

   responsive: true,
   maintainAspectRatio: false,
   animation: false,
   

   plugins: {

        legend: {
          position: "bottom"
        }

      },

      scales: {

        x: {

          grid: {
            display: false
          }

        },

        y: {

          beginAtZero: true,

          ticks: {
            stepSize: 500
          }

        }

      }

    }

  })

}

export function preencherProjecaoFinanceira(dados){

  const container =
  document.getElementById("projecaoFinanceira")

  if(!container) return

  const valorAtual =
  Number(dados.valor || 0)

  const economia =
  Number(dados.economia || 0)

  const valorComSistema =
  Math.max(valorAtual - economia, 180)

  let html = ""

  let valorProjetado =
  valorComSistema

  let anoAtual = 2026

  for(let i = 0; i < 6; i++){

    valorProjetado *= 1.085

    html += `

      <div style="
        display:flex;
        justify-content:center;
        gap:25px;
      ">

        <strong>
          ${anoAtual + i}:
        </strong>

        <span>
          R$ ${valorProjetado.toFixed(2)}
        </span>

      </div>

    `
  }

  container.innerHTML = html


}


export function preencherAnaliseFinanceira(dados){

const valorAtual =
Number(dados.valorConta || 0)

const economia =
Number(dados.economia || 0)

const valorComSistema =
Math.max(valorAtual - economia, 130)

  document.getElementById("semSistema").innerText =
`R$ ${valorAtual.toFixed(2)}/mês`

document.getElementById("comSistema").innerText =
`R$ ${valorComSistema.toFixed(2)}/mês`

document.getElementById("anoSemSistema").innerText =
`R$ ${(valorAtual * 12).toFixed(2)}/ano`

document.getElementById("anoComSistema").innerText =
`R$ ${(valorComSistema * 12).toFixed(2)}/ano`

document.getElementById("economiaMensalTexto").innerText =
`R$ ${economia.toFixed(2)}/mês`

document.getElementById("economiaAnualTexto").innerText =
`R$ ${(economia * 12).toFixed(2)}/ano`

  }




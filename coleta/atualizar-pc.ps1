# Coleta, no PC, as fontes que bloqueiam o GitHub (hoje só o Lance Judicial) e publica na vitrine.
# Roda pela tarefa agendada "Eleva Capital - coleta Lance Judicial" (Agendador de Tarefas do Windows), 1x por dia.
# As outras 4 fontes são coletadas pelo GitHub Actions às 06h; aqui só entra o que falta.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$log = Join-Path $PSScriptRoot 'data\atualizar-pc.log'
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
Start-Transcript -Path $log -Append | Out-Null
try {
  Set-Location $repo
  git pull --rebase --autostash -q
  if ($LASTEXITCODE -ne 0) { throw 'git pull falhou' }
  node coleta/run.js lancejudicial
  if ($LASTEXITCODE -ne 0) { throw 'coleta falhou' }
  node gerar-dados.mjs   # código 1 = alguma fonte atrasada ou falhou: publica mesmo assim (o alerta fica no GitHub)
  git add dados.json status.json
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    git commit -q -m "dados (PC): Lance Judicial $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    for ($i = 0; $i -lt 3; $i++) {
      git push -q
      if ($LASTEXITCODE -eq 0) { break }
      git pull --rebase -q
    }
  }
} finally {
  Stop-Transcript | Out-Null
}

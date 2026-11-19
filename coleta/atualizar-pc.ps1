# Coleta, no PC, as fontes que bloqueiam o GitHub (hoje so o Lance Judicial) e publica na vitrine.
# Roda pela tarefa agendada "Eleva Capital - coleta Lance Judicial" (Agendador de Tarefas do Windows), 1x por dia.
# As outras 4 fontes sao coletadas pelo GitHub Actions as 06h; aqui so entra o que falta.
# Log: coleta\data\atualizar-pc.log
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$log = Join-Path $PSScriptRoot 'data\atualizar-pc.log'
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null

& {
  "==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  Set-Location $repo
  git pull --rebase --autostash -q
  if ($LASTEXITCODE -ne 0) { 'ERRO: git pull falhou'; return }
  node coleta/run.js lancejudicial
  if ($LASTEXITCODE -ne 0) { 'ERRO: coleta falhou'; return }
  node gerar-dados.mjs   # codigo 1 = alguma fonte atrasada ou falhou: publica mesmo assim (o alerta fica no GitHub)
  git add dados.json status.json
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) { 'sem mudancas'; return }
  git commit -q -m "dados (PC): Lance Judicial $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  for ($i = 0; $i -lt 3; $i++) {
    git push -q
    if ($LASTEXITCODE -eq 0) { 'publicado'; return }
    git pull --rebase -q
  }
  'ERRO: git push falhou'
} *>&1 | ForEach-Object { "$_" } | Out-File -Append -Encoding utf8 $log

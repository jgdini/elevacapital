# Coleta de imóveis de leilão (piloto Eleva Capital)

Base: a coleta do Veículo Judicial (`leilao-carros/scraper`), trocando a categoria de veículos por imóveis.

```
node run.js                 # todas as fontes
node run.js zuk eleiloes    # só algumas (sobrescreve data/ só com elas)
```

Saída:
- `data/imoveis.json`: um registro por imóvel ativo (tipo, área, bairro, cidade/UF, natureza, lance, 1ª e 2ª praça, desconto, encerramento, ocupação, foto, link).
- `data/resumo.json`: o que cada fonte entrega (quantidade e % de campos preenchidos), por tipo, por UF e por natureza.

## Fontes

| Fonte | Como lê | Observação |
|---|---|---|
| Leilões Judiciais | API do portal (`tipo=3`) | Reúne vários leiloeiros; maior volume. Sem campo de avaliação: desconto calculado sobre a 1ª praça |
| Mega Leilões | HTML de `/imoveis?pagina=N` | Algumas páginas devolvem 500; o coletor tenta de novo e pula |
| Lance Judicial | HTML de `/imoveis?pagina=N` | Quase tudo judicial |
| Portal Zuk | HTML + POST `/leilao-de-imoveis/mais` | Limita frequência (429): pausa de 1,5 s e nova tentativa; inclui venda direta |
| E-Leilões | API `/api/categorias/imoveis` | Traz avaliação de verdade |

Fora por enquanto: **Caixa** (bloqueia robô com CAPTCHA; não contornar — alternativa é importar a planilha que a própria Caixa disponibiliza, baixada por uma pessoa).

`imovel.js` concentra a classificação (tipo, área em m², ocupação, natureza, desconto).

## Atualização automática

A coleta mora neste repositório (`jgdini/elevacapital`) e roda sozinha no GitHub Actions todo dia às 06:00 de Brasília
(`.github/workflows/atualizar.yml`): `node coleta/run.js` → `node gerar-dados.mjs` → commit de `dados.json` e `status.json`.

- Ver se falhou: https://github.com/jgdini/elevacapital/actions (vermelho = falha; o GitHub também manda e-mail) e
  https://jgdini.github.io/elevacapital/status.json (resultado por fonte).
- Fonte que falha não some da vitrine: ficam os imóveis dela da coleta anterior. Se o total cair para menos da metade, nada é publicado.
- Rodar na hora: Actions → "Atualizar vitrine" → Run workflow. Localmente: `node coleta/run.js && node gerar-dados.mjs`.

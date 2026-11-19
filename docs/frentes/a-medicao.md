# Frente A • Medição foto × modelo

Origem: blueprint, frente A. Sem esta frente a prioridade dos 160 itens continua sendo opinião.

## Objetivo

Medir automaticamente o quanto cada modelo se parece com a foto, e gerar um relatório ordenado do pior para o melhor.

## Pode editar

- `scripts/medicao/` (novo)
- `tests/visual/` (novo)
- `docs/frentes/a-medicao.md` (este arquivo)

## Entregas

1. Script que recebe a pasta de fotos por argumento (as fotos ficam fora do repositório) e o catálogo (`ludus` ou `ludus-core`).
2. Renderização do modelo na vista da foto, usando a câmera do spec (`camera` e `calibration` já existem no esquema). Copie a lógica de `scripts/thumbnails.ts`; **não edite** esse arquivo.
3. Métricas por produto: IoU de silhueta (o protótipo está em `catalogs/ludus/silhueta.py`) e SSIM sobre máscara e contorno.
4. Relatório JSON e uma folha de contato HTML (foto à esquerda, modelo à direita, nota embaixo), ordenada pela nota.
5. Executor de regressão visual: grava imagens de referência aprovadas e falha se um modelo mudar além da tolerância.

## Critério de aceite

- Roda para `ludus-core` (66) e `ludus` (94) sem intervenção.
- Resultado determinístico: duas execuções dão as mesmas notas.
- Documentação de uso no próprio script, em português.
- Não toca em `src/`.

## Como validar

Rodar o script nos dois catálogos e conferir que os itens que o blueprint aponta como piores (LD-WH001 a 003, 046, 066) aparecem no topo da lista.

## Regras de convivência (iguais em todas as frentes)

Estas regras existem para que várias frentes andem ao mesmo tempo e possam ser mescladas em qualquer ordem, sem conflito.

1. **Parta de `main`** e mexa só nos caminhos de "Pode editar". Arquivos novos vão em pastas novas desta frente. Se precisar de algo fora da lista, não edite: descreva no PR e siga em frente.
2. **Não edite** `package.json` nem `package-lock.json`, salvo se esta frente declarar isso em "Pode editar". Dependência nova em duas frentes ao mesmo tempo gera conflito no lockfile.
3. **Não commite saídas regeneradas**: `catalogs/*/models/`, `catalogs/*/manifest.json`, `catalogs/*/specs-report.json`, `*.thumb.png`. Elas são regeneradas uma única vez depois que todas as frentes forem mescladas. Se a sua validação exigir regenerar, faça local e não faça `git add`.
4. **Não edite** `src/index.ts`, `vite.config.ts`, `catalogs/*/classify.ts` nem `README.md`. São pontos comuns. Para expor algo novo, exporte do índice da sua própria pasta; a integração é feita depois.
5. **API estável**: não mude assinaturas públicas existentes. Só acrescente.
6. **Testes**: `npm run typecheck` e `npm test` precisam passar na sua branch. Acrescente testes para o que criar. Não afrouxe teste existente; se um limite precisar mudar, diga no PR e justifique.
7. **Não faça merge.** Ao terminar, tire o PR de rascunho e escreva no corpo o que foi feito, como validar e o que ficou de fora.
8. **Honestidade**: marque como não feito o que não foi feito. Nada de código de enfeite ou parâmetro que não faz nada.
9. **Contexto**: o diagnóstico e as metas estão em `docs/BLUEPRINT-REALISMO.md` (PR #4 do repositório). A issue índice lista todas as frentes e a ordem de integração.

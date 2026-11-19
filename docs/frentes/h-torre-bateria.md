# Frente H • Torre de bateria realista

Origem: blueprint, frente B, item 2. É a peça que mais aparece no catálogo Core e a que mais destoa da foto: hoje é um bloco maciço, e a foto mostra um quadro aberto.

## Objetivo

Reconstruir a torre das máquinas de bateria de pesos a partir de como ela é de verdade.

## Pode editar

- `src/families/selectorizedTower.ts`
- `src/parts/tower/` (novo)
- `tests/tower.test.ts` (novo)
- `docs/frentes/h-torre-bateria.md` (este arquivo)

## Entregas

1. Quadro aberto com duas colunas-guia cromadas, travessa superior e capa opcional.
2. Pilha de placas visíveis, com furos e a placa selecionada destacada, e o pino seletor.
3. Cabo e roldanas à vista, com o trajeto coerente com o curso da pilha.
4. O cabeçote com o logo e a placa de instrução já existentes (`src/parts/decals.ts`, só leitura).
5. Parâmetros novos opcionais no esquema da família (sem mudar os existentes) para quadro aberto ou capa fechada.

## Itens para conferir contra a foto

Core: LD-WH015 a 019, 021 a 023, 031, 033, 040 a 045, 048, 050, 054 a 056, 059. Premium: as máquinas de bateria (LD-B001 a B033).

## Critério de aceite

- Caixa ±2%, piso, articulações e orçamento de triângulos continuam passando para todos os itens de bateria.
- Imagens antes e depois de 6 itens no corpo do PR.
- Sem escala de malha para caber na caixa em itens que hoje não precisam dela.

## Não faça

Não edite `src/families/machine/` (é da frente I), nem `classify.ts`, nem o esquema. Se a torre precisar de algo de `machine/`, descreva no PR.

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

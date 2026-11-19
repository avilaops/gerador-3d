# Frente H • Torre de bateria realista

Origem: blueprint, frente B, item 2. É a peça que mais aparece no catálogo Core e a que mais destoa da foto: hoje é um bloco maciço, e a foto mostra um quadro aberto com colunas-guia, pilha de placas e cabos.

## Objetivo

Reconstruir a torre e a pilha de placas das máquinas de bateria a partir de como elas são de verdade.

## Pré-requisito

Para validar os itens Core com o mapeamento por foto, o PR #3 precisa estar mesclado em `main`. Enquanto não estiver, use `git checkout origin/core-modelos-por-foto -- catalogs/ludus-core/classify.ts` **sem commitar** esse arquivo, e regenere os specs localmente: `npx vite-node scripts/import-core.ts catalogs/ludus-core/products.json`.

## Pode editar

- `src/families/selectorizedTower.ts`
- `src/families/cableStation.ts`
- `src/families/machine/machine.ts` (**só este arquivo** de `machine/`; o resto é da frente I)
- `src/parts/assemblies.ts`
- `src/parts/tower/` (novo)
- `tests/tower.test.ts` (novo)
- `docs/frentes/h-torre-bateria.md` (este arquivo) e `docs/frentes/evidencias/h-torre-bateria/`

## Contexto no código (verificado)

- A torre e a pilha moram em `src/parts/assemblies.ts`: `tower(kit, TowerOptions)`, `weightStack(kit, opts)` e `stackTower(kit, opts)`, que devolve `{ group, articulation }`.
- Quem chama `stackTower`: `selectorizedTower.ts` (linha ~142), `cableStation.ts`, `legPress.ts` (duas vezes) e `machine/machine.ts` (linha ~142). **`machine.ts` é o caminho da maioria das máquinas Core**, porque a família `selectorized-tower` entrega à máquina genérica tudo, menos o Peck Deck. Por isso esta frente é dona desse arquivo.
- `pivotArm` também mora em `assemblies.ts` e é usado por `plateLoadedLever.ts`, `selectorizedTower.ts`, `cableStation.ts` e `src/parts/rig.ts`. **Não altere `pivotArm`** nem sua assinatura.
- `legPress.ts` (frente I) também chama `stackTower`. Se você mantiver a assinatura e acrescentar só opções novas, ele continua funcionando sem edição.
- O gerador **ajusta à caixa remontando a família** com dimensões de projeto corrigidas. Mudar a torre muda o tamanho da peça e pode fazer o laço de ajuste divergir: confira os avisos de escala no manifesto.
- Itens Premium com torre foram **ajustados contra a foto** (README: "as máquinas de bateria usam a base compacta das fotos"). LD-B004 está aprovado. Não regrida esses.

## Contrato

Opção nova de estilo, por exemplo `style: 'solid' | 'open'`, com padrão `'solid'` (o comportamento de hoje). A escolha do estilo aberto vem por parâmetro da família (`params`), não por mudança do padrão. Assim o Premium aprovado não muda sem querer. No PR, diga **quais itens** passam a usar o estilo aberto e mostre a foto de cada um.

## Etapas

1. **Quadro aberto**: duas colunas-guia cromadas, travessa superior, base, e capa lateral opcional.
2. **Pilha de placas** visíveis, com furos, a placa selecionada destacada e o pino seletor.
3. **Cabo e roldanas** à vista, com trajeto coerente com o curso da pilha.
4. Cabeçote com o logo e a placa de instrução já existentes (`src/parts/decals.ts`, só leitura).
5. Parâmetros novos opcionais na família, sem mudar os existentes.
6. Conferir a animação: a pilha sobe com o curso e as placas não atravessam a coluna.

## Itens para conferir contra a foto

Core: LD-WH015 a 019, 021 a 023, 031, 033, 040 a 045, 048, 050, 054 a 056, 059. Premium: máquinas de bateria `LD-B001` a `LD-B033` (confira que as aprovadas não mudaram).

## Testes

- Caixa ±2%, piso, articulação e orçamento de triângulos passam para todos os itens de bateria.
- Com `style` omitido, árvore de nós e triângulos idênticos aos de `main` (trava de regressão do Premium).
- Estilo aberto: pilha com o número de placas esperado e curso da articulação dentro da coluna.

## Riscos

- Mais geometria na torre aumenta triângulos em dezenas de itens: medir e informar.
- Colisão placa × coluna no movimento: o manifesto reporta; deve ficar zerada.

## Fora de escopo

O resto de `src/families/machine/` e `legPress.ts` (frente I), `plateLoadedLever.ts`, `classify.ts` e o esquema.

## Critério de aceite

- Imagens antes e depois de 6 itens, com a foto ao lado.
- Nenhum item que hoje não precisa de escala de malha passa a precisar.
- Premium sem `style` inalterado.

## Regras de convivência (iguais em todas as frentes)

Estas regras existem para que várias frentes andem ao mesmo tempo e possam ser mescladas em qualquer ordem, sem conflito.

### Escopo

1. **Parta de `main`** e mexa só nos caminhos de "Pode editar". Arquivos novos vão em pastas novas desta frente. Se precisar de algo fora da lista, **não edite**: descreva a necessidade no PR (seção "Pedidos para a integração") e siga em frente.
2. O mapa completo de quem é dono de cada caminho está em `docs/frentes/escopo.json`. Quando o PR de checagem de escopo for mesclado, o CI reprova qualquer PR `frente/*` que toque arquivo de outra frente.
3. **Sem dono** (ninguém edita nas frentes, só na integração): `src/index.ts`, `vite.config.ts`, `catalogs/*/classify.ts`, `README.md`, `src/families/bench.ts`, `src/families/rack.ts`, `src/parts/rig.ts`, `src/footprint.ts`, `src/calibration.ts`, `src/thermal-box/`, `web/gallery.ts` e os testes que já existem.
4. **Não edite** `package.json` nem `package-lock.json`, salvo a frente G. Dependência nova em duas frentes ao mesmo tempo conflita no lockfile.
5. **Não commite saídas regeneradas**: `catalogs/*/models/`, `catalogs/*/manifest.json`, `catalogs/*/specs-report.json`, `catalogs/*/specs/`. Regenere localmente para validar, **sem `git add`**. Elas são regeneradas uma única vez depois que todas as frentes forem mescladas.

### Qualidade

6. **API estável**: não mude assinaturas públicas existentes, só acrescente. Opção nova tem padrão igual ao comportamento atual.
7. `npm run typecheck` e `npm test` precisam passar na sua branch. Acrescente testes para o que criar. Não afrouxe teste existente; se um limite precisar mudar, diga no PR e justifique com números.
   **Orçamento atual**: cada modelo tem no máximo **30 mil triângulos** (`src/generate.ts`, padrão de `triangleBudget`, e as constantes de `tests/catalog.test.ts` e `tests/generator.test.ts`) e **1,5 MB de GLB** (`tests/export.test.ts`). Esses testes existem e ninguém os edita nas frentes. Se a sua frente precisar de mais, **não suba o limite**: reduza o custo, ou registre o pedido no PR para a integração decidir (a frente G cuida dos orçamentos por nível de detalhe).
8. **Sem enfeite**: nada de parâmetro que não faz nada nem código morto. O que não foi feito vai marcado como não feito.
9. Commits pequenos, mensagem em português, no formato `Frente X • o que mudou`.

### Evidência

10. Mudança visual exige imagem **antes e depois**. Guarde em `docs/frentes/evidencias/<frente>/` (PNG de até 250 KB cada, no máximo 12) e referencie no corpo do PR. Para itens Core, compare com a foto publicada em `https://ludusequipamentos.com/midias/produtos/<codigo>` (por exemplo `LD-WH001`).
11. Medida vale mais que adjetivo: quando disser "melhorou", dê o número (triângulos, bytes, IoU, milissegundos).

### Entrega

12. **Não faça merge.** Ao terminar, tire o PR de rascunho. O corpo do PR deve ter: o que foi feito, como validar, o que ficou de fora e os pedidos para a integração.
13. **Bloqueio**: se algo impedir a frente (ferramenta ausente, decisão pendente), registre no PR o que tentou e o que falta, e pare. Não invente atalho.
14. Marque o checklist de entrega abaixo no corpo do PR antes de tirar do rascunho.

### Checklist de entrega

- [ ] Só toquei nos caminhos permitidos
- [ ] `npm run typecheck` e `npm test` passam
- [ ] Testes novos cobrem o que criei
- [ ] Não commitei saída regenerada nem lockfile (salvo a frente G)
- [ ] Evidência antes e depois no PR, com números
- [ ] Pedidos para a integração listados
- [ ] Contexto de partida: `docs/BLUEPRINT-REALISMO.md` (PR #4) e issue índice #16

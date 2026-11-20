# Frente I • Máquinas de alavanca e leg press

Origem: blueprint, frente B, itens 3 a 6. Os agachamentos, a panturrilha e a remada solo seguem muito longe da foto.

## Objetivo

Modelar bem, uma vez, os mecanismos de anilha que se repetem, com articulação verdadeira e sem colisão.

## Pré-requisito

Para validar os itens Core com o mapeamento por foto, o PR #3 precisa estar mesclado em `main`. Enquanto não estiver, use `git checkout origin/core-modelos-por-foto -- catalogs/ludus-core/classify.ts` **sem commitar** esse arquivo, e regenere os specs localmente: `npx vite-node scripts/import-core.ts catalogs/ludus-core/products.json`.

## Pode editar

- `src/families/plateLoadedLever.ts`
- `src/families/legPress.ts`
- `src/families/machine/` **exceto `machine.ts`** (que é da frente H): ou seja, `exercises.ts`, `stations.ts` e arquivos novos
- `tests/levers.test.ts` (novo)
- `docs/frentes/i-alavancas.md` (este arquivo) e `docs/frentes/evidencias/i-alavancas/`

## Contexto no código (verificado)

- `src/families/machine/exercises.ts` (936 linhas) é a **tabela de exercícios**: cada mecanismo (`chest-press`, `incline-press`, `decline-press`, `lying-press`, `shoulder-press`, `row`, `low-row`, `pulldown`, `t-bar`, `ground-lever`, `nordic`, `seated-calf`, `standing-calf`, `horizontal-calf`, `hip-thrust`, `jammer` e outros) define alavancas, estação do corpo e curso. `stations.ts` (236 linhas) monta as estações. **A maior parte do trabalho está aqui**, não em `plateLoadedLever.ts`.
- Mecanismos do Premium e do Core compartilham a tabela: uma correção ajuda os dois, e **pode regredir** o Premium. Itens Premium já ajustados contra a foto: LD-A002, LD-B004, LD-B012, LD-B035, LD-A042, o Pendulum e o V-squat.
- `legPress.ts` tem as variantes `sled`, `hack`, `lever-squat`, `belt-squat` e `horizontal`. Chama `stackTower`, que é da frente H; mantenha as chamadas como estão.
- Mapeamento Core por foto (PR #3): LD-WH001 e 002 `lever-squat`, 003 `belt-squat`, 034 a 036 `hack`, 037 a 039 `sled`, 040 `horizontal`, 046 `seated-calf`, 053 `pulldown`, 057 `t-bar`, 058 `row`, 065 `standing-calf`, 066 `ground-lever`, 006 `nordic`.
- O gerador reduz o curso com `swingScale` e `travel` em `MOTION_OVERRIDES` (`catalogs/ludus-core/classify.ts`) para esconder colisões. É o sintoma que esta frente deve tratar na causa.
- Estado após o PR #3, no manifesto Core: 13 itens com ajuste de escala de malha (LD-WH006 40%, 066 38%, 046 30%, 056 26%, 001 18%) e colisões de movimento em LD-WH015, 016 e 032 (de uma colisão cada).

## Etapas

1. **Agachamento de alavanca** (búlgaro, pêndulo, sumô): braço, contrapeso, plataforma e pegadas na proporção da foto.
2. **Leg press 45° e 90°, hack**: carro, trilhos, apoio lombar e suporte de anilhas.
3. **Panturrilha em pé e sentada** e **remada solo**.
4. **Cavalinho (T-bar)** e **remada sentada articulada**.
5. **Cinemática correta**: pivôs com bucha, braços com arco certo, curso limitado pela geometria.
6. **Tratar as colisões** reportadas no manifesto em vez de reduzir o curso. Liste no PR os `MOTION_OVERRIDES` que deixam de ser necessários; **não** edite `classify.ts`.
7. Reduzir os itens escalados por malha; informe quantos eram e quantos ficaram.

## Itens para conferir contra a foto

Core: LD-WH001 a 003, 006, 034 a 039, 046, 053, 057, 058, 065 e 066. Premium: `LD-A023` a `A041`, e confira que os já ajustados não mudaram.

## Testes

- Caixa ±2%, piso, articulação e colisão de movimento passam para todos os itens de alavanca e leg press.
- **Trava do Premium**: para os itens Premium já ajustados, árvore de nós e triângulos idênticos aos de `main` (ou diferença justificada no PR, com imagem).
- Cada mecanismo novo tem teste de curso: o movimento fica dentro da caixa de projeto sem escala.

## Riscos

- A tabela compartilhada regride o Premium: a trava acima existe por isso.
- Mecanismo mais fiel costuma ser maior que a caixa publicada: nesse caso, o modelo segue a ficha técnica e o PR registra a divergência com a foto.

## Fora de escopo

`machine/machine.ts` e `selectorizedTower.ts` (frente H), `classify.ts`, o esquema.

## Critério de aceite

- Imagens antes e depois de 6 itens, com a foto ao lado.
- Itens escalados por malha e colisões de movimento: números antes e depois no PR.
- Premium aprovado sem regressão.

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

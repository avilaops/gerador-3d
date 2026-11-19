# Frente E • Luz e render do visualizador

Origem: blueprint, frente E, itens 1 a 4 e 7. É o maior ganho visual pelo menor custo.

## Objetivo

Trocar o `RoomEnvironment` genérico e a sombra simples por iluminação de estúdio e sombra de contato, **sem atualizar o Three.js** (isso é a frente K).

## Pode editar

- `src/viewer/EquipmentViewer.ts`
- `src/viewer/camera.ts`
- `src/viewer/lighting/` (novo)
- `web/render.ts`
- `tests/viewer-lighting.test.ts` (novo)
- `docs/frentes/e-luz-viewer.md` (este arquivo) e `docs/frentes/evidencias/e-luz-viewer/`

## Contexto no código (verificado)

- `EquipmentViewer.ts` hoje: `ACESFilmicToneMapping` com exposição 0,72; ambiente `RoomEnvironment` passado por `PMREMGenerator`; `HemisphereLight` de 0,08; luz principal `DirectionalLight` de 1,1 com sombra `PCFSoftShadowMap` (mapa 1024 ou 2048 conforme o aparelho); contraluz de 0,2; piso com `ShadowMaterial` de opacidade 0,26.
- A intensidade do ambiente por material vem de `ENV_INTENSITY[mat.name]`. **Não renomeie materiais** (é da frente D) e preserve esse mecanismo.
- Já existem e devem continuar: renderização sob demanda quando parado, pausa fora da viewport e com a aba oculta, recuperação de perda de contexto WebGL, `setView` e `resetView`.
- `src/footprint.ts` (`computeFootprint(root, clearanceM)`) dá a projeção em planta. Só leitura.
- **O simulador do site tem cena própria**, também com `RoomEnvironment` (repositório `ludusequipamentos-website`, `src/scripts/simulador.ts`). Exponha o ambiente de estúdio como função reutilizável, `createStudioEnvironment(renderer)`, em `src/viewer/lighting/`, para o site adotar na integração.
- `src/thermal-box/ThermalBoxViewer.ts` é outro viewer. **Fora de escopo** (é da frente K).
- Um render de teste no Blender mostrou que **fundo claro e ambiente claro lavam o preto**. O estúdio deve ter áreas escuras (cartões negros laterais) para o preto da tinta ter o que refletir.

## Etapas

1. **Ambiente de estúdio procedural**: softbox grande no alto, tiras laterais claras, cartões escuros, piso neutro, convertido com PMREM. Preferir cena procedural a arquivo HDRI; se usar arquivo, no máximo 300 KB e licença livre (CC0) registrada.
2. **Três pontos de luz** calibrados em função da caixa do equipamento: principal larga e suave, preenchimento fraco, contraluz que desenha a silhueta.
3. **Sombra de contato**: textura de oclusão sob o equipamento, a partir da projeção em planta, desfocada, no lugar de depender só do mapa de sombra.
4. **Qualidade**: opção `quality: 'low' | 'high'`. `high` liga antialias melhor e sombra mais nítida; `low` é o padrão em celular. Medir custo.
5. **Cenas**: fundo claro, fundo escuro e piso de academia, por opção do construtor. O visual atual continua sendo o padrão.
6. Calibrar a exposição para que preto fique preto e o cromado não estoure.

## Testes

A parte de WebGL não roda no vitest. Teste o que é lógica pura:

- Função que calcula posição e intensidade das luzes a partir da caixa (equipamento pequeno e grande dão luz proporcional).
- Função que gera a textura de sombra de contato: dimensões, normalização e simetria para uma projeção simétrica.
- Valores padrão preservados quando nenhuma opção nova é passada.

Validação visual: `web/render.ts` com 6 produtos (claro, escuro, cromado, estofado, bateria e peso livre).

## Riscos

- Mudar luz muda a aparência de tudo: o padrão atual tem que continuar disponível e ser o padrão.
- Sombra de contato calculada errada flutua o equipamento: conferir apoio em 3 itens de bases diferentes.
- Efeito caro derruba o celular: medir quadros por segundo com `quality: 'low'` e informar.

## Fora de escopo

Atualizar o Three.js, mexer em materiais (`kit.ts`), famílias ou `thermal-box`.

## Critério de aceite

- Visual padrão idêntico ao atual quando nenhuma opção é passada.
- `createStudioEnvironment` exportada de `src/viewer/lighting/`.
- Imagens antes e depois de 6 produtos, com o preto legível como preto.
- Medida de custo em modo celular no corpo do PR.

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

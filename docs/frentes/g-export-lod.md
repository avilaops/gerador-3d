# Frente G • Exportação, LOD e compressão

Origem: blueprint, frente F. Detalhe real pede mais triângulos, então níveis de detalhe e compressão precisam existir antes.

## Objetivo

Exportar cada modelo em três níveis de detalhe, com malha comprimida, dentro de orçamentos por nível.

## Pode editar

- `src/export/`
- `src/lod.ts`
- `scripts/export.ts`
- `package.json` e `package-lock.json` (**somente esta frente**, e só para a dependência de compressão)
- `tests/export-lod.test.ts` (novo)
- `docs/frentes/g-export-lod.md` (este arquivo) e `docs/frentes/evidencias/g-export-lod/`

## Contexto no código (verificado)

- **O LOD já existe.** `src/lod.ts` tem `buildLodVariants(root, config)` com `SimplifyModifier` do Three e três níveis: `original` (razão 1), `medium` (padrão 0,55) e `low` (padrão 0,25). O spec tem o campo opcional `lod` e o `generate` o repassa em `userData.lod`. Esta frente **estende** isso: exporta os níveis como arquivos. Não recrie do zero.
- `src/export/glb.ts` usa o `GLTFExporter` do Three r149, com animação. `src/export/usdz.ts` gera USDZ estático. O r149 imprime vários avisos "normalized normal attribute"; são ruído conhecido.
- `scripts/export.ts` gera `model.glb`, `model.usdz`, `plan.svg`, `spec.json` e o `manifest.json` do lote, com `glbBytes`, `usdzBytes`, `triangles` e `quality`. O site e o catálogo leem esse manifesto: **só acrescente campos**.
- O limite atual (30 mil triângulos e 1,5 MB por modelo) é testado hoje: padrão `triangleBudget = 30_000` em `generate.ts:257` (frente B) e constantes nos testes `catalog.test.ts`, `generator.test.ts` e `export.test.ts`. Os orçamentos por nível desta frente são **novos e separados**; não editam nada disso. Se o detalhe novo exigir mudar o gate existente, **registre como pedido para a integração**.
- O `SimplifyModifier` costuma apagar peças finas (cabos, hastes cromadas, arames): a documentação do próprio `lod.ts` já avisa. Meça isso.

## Etapas

1. **Exportar os níveis** em arquivos: `model.glb` (alto, ficha e AR), `model.lod1.glb` (médio, visualizador) e `model.lod2.glb` (baixo, simulador com dezenas de itens).
2. **Avaliar a decimação** em 6 produtos: o que some? Se peças finas desaparecem, propor estratégia complementar (omitir parafusos e costura nos níveis baixos, em vez de decimar o conjunto) e deixar a escolha documentada.
3. **Compressão de malha com meshopt**, via `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions` e `meshoptimizer`. Textura KTX2 só se a ferramenta `toktx` estiver presente; senão, documentar como opcional e **não** declarar suportada.
4. **Orçamentos por nível** em um único lugar (`src/export/budgets.ts`): alto até 120 mil triângulos, médio até 40 mil, baixo até 10 mil, com tamanho máximo de arquivo por nível. Valores iniciais, ajustáveis.
5. **Manifesto**: por modelo, `files` por nível, `triangles` e `bytes` por nível. O formato atual continua válido.
6. Opção para gerar o GLB **sem compressão**, que continua sendo o padrão até o site adotar o decodificador.
7. Documentar que o consumidor precisa do decodificador meshopt (`MeshoptDecoder`) para ler GLB comprimido.

## Testes

- O validador da Khronos (`gltf-validator`, já usado) aprova os três níveis, com e sem compressão.
- Cada nível respeita seu orçamento de triângulos e de bytes.
- Manifesto antigo (só campos velhos) continua sendo lido por quem só conhece o formato anterior.
- O GLB comprimido, descomprimido, tem a mesma caixa envolvente do original (±0,1%).

## Riscos

- GLB comprimido **não abre** no visualizador atual do site sem o decodificador: por isso a compressão é opcional e o padrão não muda.
- Decimação pode quebrar peças móveis: conferir a animação nos níveis baixos.
- Lockfile: esta é a única frente que o altera; faça commit separado e pequeno dele.

## Fora de escopo

Famílias, viewer, materiais, `generate.ts`, USDZ comprimido.

## Critério de aceite

- Tabela no PR com triângulos e bytes por nível, antes e depois, para 6 produtos.
- Os testes que já existem continuam passando sem alteração.
- Mapa do que some em cada nível baixo, com imagem.

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

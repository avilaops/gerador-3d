# Frente D • Materiais PBR

Origem: blueprint, frente D. Hoje todo material é cor, rugosidade e metal constantes, e o preto da tinta pó sai cinza.

## Objetivo

Trocar a cor chapada por material com mapas e calibrar o acabamento de tinta pó preta, cromado, couro e borracha, mantendo a API do `PartKit` e os papéis de material como estão.

## Pode editar

- `src/parts/kit.ts`
- `src/parts/decals.ts`
- `src/parts/primitives.ts` (**somente** para gerar UV onde falta; não mude formas nem assinaturas)
- `src/parts/materials/` (novo)
- `tests/materials.test.ts` (novo)
- `docs/frentes/d-materiais-pbr.md` (este arquivo) e `docs/frentes/evidencias/d-materiais-pbr/`

## Contexto no código (verificado)

- Papéis em `kit.ts`: `frame` (rugosidade 0,5, metal 0,4), `upholstery` (0,78 e 0,05), `accent`, `plate` (0,35 e 0,7), `chrome` (0,2 e 0,95), `rubber`, `cable`, `label`, `wood`. Tudo `MeshStandardMaterial`, porque o USDZ não aceita outro.
- **Metal 0,4 na tinta pó é o motivo do preto sair cinza**: um render de teste do LD-WH013 no Blender mostrou o quadro em cinza médio sob luz de estúdio. Tinta pó é dielétrica: metal perto de 0 e rugosidade entre 0,45 e 0,6.
- **Os nomes dos materiais são parte do contrato.** O viewer escolhe a intensidade do ambiente por `material.name` (`ENV_INTENSITY` em `EquipmentViewer.ts`) e o simulador do site faz o mesmo (`INTENS`). Não renomeie material nenhum.
- `bentTube` (`primitives.ts`) monta posição, normal e índice à mão e **não gera UV**; vigas (`beam`) idem. Sem UV não há textura nesses tubos, que são o grosso do modelo.
- `RADIAL_SEGMENTS = 24` nos cilindros. Pode subir onde o cromado aparece grande, dentro do orçamento.
- `decals.ts` usa `CanvasTexture` com `encoding = sRGBEncoding`. A migração dessa API é da frente K; **não** mexa nisso.
- Canvas no Node: `@napi-rs/canvas`, já nas dependências de desenvolvimento.

## Etapas

1. **Gerador de textura procedural** determinístico (ruído com semente fixa, para o teste de regressão visual da frente A não oscilar): normal, rugosidade e oclusão tileáveis de até 512 px.
2. **Tinta pó preta** (acabamento da maioria do Core): metal próximo de zero, micro-rugosidade e leve variação, reflexo largo e baixo. É a etapa de maior efeito.
3. **UV** para `bentTube` e `beam`: `u` ao longo do comprimento, `v` ao redor da seção, sem emenda visível.
4. **Cromado e aço escovado**: rugosidade baixa, metal alto, com leve anisotropia por textura.
5. **Couro sintético**: normal de poro, costura e brilho suave de borda.
6. **Borracha, espuma e plástico**: rugosidade alta, sem metal.
7. **Chapa antiderrapante** em normal map.
8. Validar a exportação: GLB no validador da Khronos e USDZ no `USDZExporter` com mapas de base, normal e rugosidade.

## Testes

- Cada papel continua existindo, com o mesmo `name`.
- Texturas determinísticas: duas gerações iguais dão os mesmos bytes.
- Todo mesh de tubo e viga tem atributo `uv`.
- O GLB de 6 produtos de famílias diferentes passa no validador e fica dentro do limite de 1,5 MB (se não couber, explique no PR com números).

## Riscos

- Textura demais pesa no GLB e no celular: tileável de até 512 px, compartilhada entre malhas.
- Mudar o material muda a cara de **todos** os itens, inclusive os Premium aprovados: mostre antes e depois de pelo menos 3 itens Premium, além de 3 Core.

## Fora de escopo

Famílias, viewer, esquema, migração de `encoding` (frente K).

## Critério de aceite

- Nenhum papel de material some nem muda de nome; as famílias não precisam mudar.
- Testes de exportação e do validador continuam passando.
- O preto da tinta pó lê como preto sob a luz de estúdio (compare com o render de teste do LD-WH013).
- Imagens antes e depois de 6 produtos no corpo do PR.

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

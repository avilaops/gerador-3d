# Frente C • Biblioteca de detalhes

Origem: blueprint, frente C. É o que separa "modelo" de "produto": parafuso, solda, tampa, costura.

## Objetivo

Criar uma biblioteca de peças de detalhe, baratas em triângulos e com geometria e material compartilhados, que as famílias possam usar depois. **Esta frente não integra nas famílias**; ela só entrega a biblioteca e prova que funciona.

## Pode editar

- `src/parts/details/` (novo, com seu próprio `index.ts`)
- `tests/details.test.ts` (novo)
- `docs/frentes/c-biblioteca-detalhes.md` (este arquivo) e `docs/frentes/evidencias/c-biblioteca-detalhes/`

## Contexto no código (verificado)

- `PartKit` (`src/parts/kit.ts`) dá `unitBox`, `unitCylinder`, `tube(w, d)`, `roundedBox`, `disc`, `torus`, os materiais por papel (`frame`, `upholstery`, `accent`, `plate`, `chrome`, `rubber`, `cable`, `label`, `wood`) e `track` para descarte. Só leitura (é da frente D).
- As funções de `src/parts/primitives.ts` recebem o `kit` primeiro e devolvem `THREE.Mesh` ou `THREE.Group`. Siga a mesma convenção.
- **O GLTFExporter r149 não exporta `InstancedMesh`.** "Instanciar" aqui significa compartilhar a mesma geometria e o mesmo material entre várias `Mesh`, como o resto do gerador faz. Não use `InstancedMesh`.
- O maior modelo atual tem cerca de 8 mil triângulos e o limite do gate é 30 mil. Cada detalhe precisa de custo documentado, porque um modelo tem dezenas deles.
- Convenção do gerador: metros, Y para cima, frente em +Z.

## Etapas, da de maior efeito visual para a de menor

1. **Tampas de tubo** (redonda e retangular) e **ponteiras plásticas**: aparecem em todo tubo aberto.
2. **Sapata de borracha com rosca** e **nivelador**.
3. **Parafusos e porcas**: sextavado, allen e abaulado, com arruela.
4. **Estofado com costura e vinco**, com espessura de espuma.
5. **Cordão de solda** sobre uma junta: geometria leve ou normal map, à escolha, justificando.
6. **Pegada com ranhura e anel de borracha** e **rolo de espuma com tampa**.
7. **Chapa antiderrapante** e **chapa furada**.
8. **Roldana com garfo**, argola e mosquetão.

## Testes

- Cada peça: sem NaN, normais unitárias, caixa envolvente igual à esperada, dentro do orçamento de triângulos declarado.
- Compartilhamento: duas chamadas iguais reaproveitam a mesma geometria (mesma referência de `BufferGeometry`).
- Nenhuma peça tem aresta viva de 90° onde a peça real tem raio (teste de ângulo máximo entre normais vizinhas, com tolerância documentada).
- Descarte: `kit.dispose()` libera tudo que a biblioteca criou.

## Riscos

- Detalhe demais estoura o orçamento: cada peça tem versão de baixo custo para o LOD (ver frente G).
- Peça bonita e fora de escala é pior que nenhuma: todas as dimensões em metros reais, com a fonte da medida comentada.

## Fora de escopo

Editar `primitives.ts`, `kit.ts`, as famílias ou `src/index.ts`. Usar a biblioteca em produto real: é a integração.

## Critério de aceite

- Biblioteca com as 8 etapas e teste para cada uma, ou o PR diz quais ficaram de fora e por quê.
- Uma tabela no PR com triângulos por peça e por nível de qualidade.
- Imagem de uma bancada com todas as peças lado a lado, em `docs/frentes/evidencias/c-biblioteca-detalhes/`.

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

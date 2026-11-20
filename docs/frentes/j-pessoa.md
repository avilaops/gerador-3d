# Frente J • Pessoa e movimento

Origem: blueprint, frente G. A figura de 1,75 m serve de escala, mas não de realismo.

## Objetivo

Trocar a figura de segmentos por um manequim com malha suave, mantendo o contrato de pose das famílias.

## Pode editar

- `src/viewer/figure.ts`
- `src/parts/pose.ts`
- `tests/figure.test.ts` (novo)
- `docs/frentes/j-pessoa.md` (este arquivo) e `docs/frentes/evidencias/j-pessoa/`

## Contexto no código (verificado)

- `figure.ts` monta a pessoa a partir de um nó vazio `pose_hip` que cada família marca (`POSE_NODE` e `PoseData` em `pose.ts`). O +Z local desse nó é a frente da pessoa.
- Proporções atuais: tronco 0,5; braço 0,30; antebraço 0,31; coxa 0,43; canela 0,45; meia largura de ombro 0,19; meia largura de quadril 0,10. Braços e pernas são resolvidos **a cada quadro**, então a pessoa acompanha o movimento do equipamento.
- Onde a família não marca o quadril (bancos, suportes, leg press, estações de cabo, máquinas deitadas), a pessoa fica em pé ao lado, só para dar escala.
- O botão "Pessoa 1,75 m" do viewer liga e desliga a figura. O viewer em si é da frente E; **não edite** `EquipmentViewer.ts`.

## Etapas

1. **Manequim procedural** de malha suave: cápsulas e superfícies de revolução com juntas que se encontram sem fresta. Sem asset externo e sem arquivo binário no repositório.
2. **Materiais** de pele neutra e roupa de treino, com opção de ocultar a pessoa.
3. **Poses por exercício** a partir de `pose_hip`: sentado, deitado, em pé e ajoelhado, com mãos nas pegadas e pés no piso ou no rolo.
4. Proporções de adulto de 1,75 m, com mão e pé que não atravessam a máquina nos itens atuais.
5. Manter o orçamento: a figura aparece junto do modelo; informe os triângulos dela.

## Testes

- O contrato de `pose.ts` não muda: um nó `pose_hip` existente produz a mesma âncora de antes.
- Comprimentos de segmento preservados: a distância ombro-mão nunca passa do alcance do braço.
- Nenhum NaN nas juntas em 5 poses extremas.

## Riscos

- Malha suave e juntas com fresta ou atravessando a máquina é pior que a figura simples: conferir em 6 equipamentos.
- A figura vem de nós que as famílias marcam; onde não há marca, não invente pose.

## Fora de escopo

Famílias, o resto do viewer, riggs com asset externo, animação por captura de movimento.

## Critério de aceite

- Nenhuma família precisa ser editada.
- Imagens da pessoa em 6 equipamentos diferentes no corpo do PR.
- Triângulos da figura informados; sem queda perceptível de desempenho com ela ligada.

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

# Frente A • Medição foto × modelo

Origem: blueprint, frente A. Sem esta frente a prioridade dos 160 itens continua sendo opinião, e as frentes de aparência (D, E, K) não têm rede de proteção contra regressão.

## Objetivo

Medir automaticamente o quanto cada modelo se parece com a foto, gerar um relatório ordenado do pior para o melhor e checar regressão visual.

## Pré-requisito

Para medir o Core com o mapeamento por foto, o PR #3 precisa estar mesclado em `main`. Enquanto não estiver, valide com `git checkout origin/core-modelos-por-foto -- catalogs/ludus-core/classify.ts` **sem commitar** esse arquivo, e regenere os specs localmente (comando abaixo).

## Pode editar

- `scripts/medicao/` (novo)
- `tests/visual/` (novo)
- `docs/frentes/a-medicao.md` (este arquivo) e `docs/frentes/evidencias/a-medicao/`

## Contexto no código (verificado)

- `scripts/thumbnails.ts` renderiza as miniaturas com `puppeteer-core` e Chrome ou Edge sem tela, usando `web/render.html`. Flags úteis: `--catalog`, `--azimuth`, `--distance`, `--mask`, `--name`. **Não edite** esse arquivo; copie a lógica.
- `catalogs/ludus/silhueta.py` calcula IoU: recorta cada contorno **na própria caixa** e o encaixa em 128 px. Isso apaga a diferença de proporção entre foto e modelo, que é justamente um erro comum. A nota nova precisa penalizar proporção.
- O spec tem `camera` (`azimuthDeg`, `elevationDeg`, `distanceM`, `target`) e `calibration` (`sourceImage`, `landmarks` com pelo menos 2 pontos, `confidence`). `evaluateCalibration` está em `src/calibration.ts`.
- Fotos Core publicadas: `https://ludusequipamentos.com/midias/produtos/<codigo>`, em WebP, fundo branco. As do Premium vêm da pasta de fotos do catálogo, fora do repositório.
- Regenerar specs Core localmente: `npx vite-node scripts/import-core.ts catalogs/ludus-core/products.json` (sem `git add`).

## Etapas

1. **Ingestão**: baixar e guardar em cache local (fora do git) as fotos pelo código; registrar vista, lado e origem.
2. **Segmentação da foto**: máscara por limiar sobre o fundo claro, com limpeza morfológica e remoção de sombra do piso. Registrar a confiança da máscara.
3. **Render do modelo** na vista da foto, com máscara sem sombra (reproduza o `--mask`).
4. **Espelhamento**: o lado da foto varia. Calcule a nota normal e a espelhada, use a maior e **grave qual foi**.
5. **Métricas**: IoU de silhueta com penalidade de proporção (razão largura/altura da caixa), SSIM sobre contorno e IoU por regiões (terço superior, médio, inferior) para localizar onde diverge.
6. **Relatório**: JSON por catálogo e uma folha de contato HTML (foto, modelo, sobreposição, nota), ordenada pela nota.
7. **Regressão visual**: grava as imagens de referência aprovadas e falha se um modelo mudar além da tolerância configurável. Aprovar uma mudança é um comando explícito.
8. Documentar o uso no próprio script, em português.

## Testes

- Máscaras sintéticas: iguais dão 1, disjuntas dão 0, deslocadas dão valor intermediário conhecido.
- Penalidade de proporção: mesma silhueta esticada em 30% cai abaixo de uma esticada em 5%.
- Determinismo: duas execuções dão as mesmas notas.
- Executor de regressão em pasta temporária: passa sem mudança, falha com mudança, aprova com o comando.

## Riscos

- Foto com reflexo ou objeto ao fundo quebra a máscara: relatar a confiança e nunca esconder uma nota baixa por máscara ruim.
- Chrome ou Edge ausente: parar e registrar o bloqueio.
- Notas absolutas enganam; o valor está na **ordenação** e na **comparação antes e depois**.

## Fora de escopo

Alterar modelos, aprovar itens, mexer em `src/`.

## Critério de aceite

- Roda para `ludus-core` (66) e `ludus` (94) sem intervenção.
- Os itens que o blueprint aponta como piores (LD-WH001 a 003, 046, 066) aparecem entre os de menor nota, ou o PR explica por que não.
- Duas execuções iguais dão relatório igual.

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

# Frente F • Render offline de alta qualidade

Origem: blueprint, frente E, item 6. É o que mais se aproxima de foto de verdade em imagem fixa.

## Objetivo

Pipeline sem tela que transforma os GLB em imagens de revista para catálogo, miniatura e foto de venda.

## Pode editar

- `scripts/render-offline/` (novo; Python e script do Blender, **sem dependência npm**)
- `docs/frentes/f-render-offline.md` (este arquivo) e `docs/frentes/evidencias/f-render-offline/`

## Estado de partida (já verificado)

O Blender foi instalado e testado antes de abrir esta frente, para não deixar a decisão para depois:

- **Blender 4.5.16 LTS**, zip portátil oficial de `download.blender.org/release/Blender4.5/`, SHA-256 `e258e90a1ebc14798ad65b3426bc5f11f5e0e013541c61cc7c3ee9bbf4ca0ce6` (confere com o arquivo `.sha256` da Blender Foundation). Não precisa instalar no sistema: basta extrair o zip numa pasta nova.
- Em Windows, `blender.exe -b --python <script> -- <args>` funciona sem tela.
- Há um **script de partida funcional** em `scripts/render-offline/spike_render.py`: importa o GLB, mede a caixa, põe piso, ambiente neutro, três luzes de área e câmera por azimute e elevação, e renderiza em Cycles com denoise. Use como base, não como entrega.
- Resultado do teste com o LD-WH013: **1 min 28 s** para 1024 × 768, 64 amostras, CPU, com denoise. Em 2048 × 1536 espere cerca de 4 vezes isso. A imagem de teste está em `docs/frentes/evidencias/f-render-offline/spike_wh013.png`.

## Armadilhas já encontradas

1. **Caminho de saída relativo** vai parar na raiz do disco (`C:\`) e o render some. Use sempre caminho absoluto.
2. O importador glTF converte Y para cima em Z para cima. A frente do modelo (+Z no gerador) vira **-Y** no Blender; o azimute da câmera precisa levar isso em conta.
3. **O preto sai cinza.** Os materiais do gerador têm `frame` com metal 0,4 (frente D vai corrigir) e o ambiente do teste era claro demais. No estúdio, use cartões escuros e reduza a intensidade do mundo; não corrija o material aqui.
4. Fundo transparente exige `film_transparent` e o piso como `shadow catcher`; sem isso a sombra some.

## Etapas

1. Transformar o script de partida em módulo com argumentos: pasta de modelos, filtro de códigos, vistas, tamanho, amostras e saída.
2. **Estúdio de produto**: fundo infinito (curva), piso com sombra suave, luz de área grande no alto, tiras laterais e cartões escuros para dar definição ao preto.
3. Vistas: frente, lado e três-quartos; câmera com lente de 50 a 85 mm e enquadramento pela caixa.
4. Saídas: PNG com fundo opaco e PNG com fundo transparente.
5. **Lote retomável**: não refaz o que já existe e continua de onde parou. Registro em JSON do que foi gerado, tempo e semente.
6. **Determinístico**: mesma semente, mesmo resultado.
7. Documentação: como obter o Blender (com o hash), como rodar, tempo por imagem, como retomar.

## Testes

Sem Blender no CI, teste o que é lógica pura em Python (`pytest` ou `unittest`, sem dependência nova no repositório):

- Cálculo de enquadramento e posição de câmera a partir de caixa e azimute.
- Seleção de modelos por filtro e retomada (pula o que já existe).
- Montagem da linha de comando.

A validação do render em si é manual, com as imagens no PR.

## Critério de aceite

- Roda para 6 produtos de tipos diferentes (bateria, alavanca, banco, rack, estação de cabo, leg press), com as imagens em `docs/frentes/evidencias/f-render-offline/`.
- Retomada comprovada: interromper e rodar de novo não refaz as imagens prontas.
- Tempo por imagem informado, em CPU.

## Fora de escopo

Dependência npm, `src/`, corrigir materiais, e qualquer outro motor de render.

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

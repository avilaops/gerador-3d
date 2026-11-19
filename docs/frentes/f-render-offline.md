# Frente F • Render offline de alta qualidade

Origem: blueprint, frente E, item 6. É o que mais se aproxima de foto de verdade em imagem fixa.

## Objetivo

Pipeline sem tela que transforma os GLB em imagens de revista para catálogo, miniatura e foto de venda.

## Pode editar

- `scripts/render-offline/` (novo; Python e script do Blender, **sem dependência npm**)
- `docs/frentes/f-render-offline.md` (este arquivo)

## Entregas

1. Script do Blender (modo sem tela) que importa `model.glb`, monta estúdio com luz de área, fundo infinito e piso com sombra, e renderiza em Cycles.
2. Saídas: PNG 2048 px com fundo opaco e PNG com fundo transparente, vistas frente, lado e três-quartos.
3. Lote: recebe uma pasta de modelos e um filtro de códigos, e é retomável (não refaz o que já existe).
4. Determinístico: mesma semente, mesmo resultado.
5. Documentação: versão do Blender testada, como instalar, tempo por imagem, como rodar em lote.

## Critério de aceite

- Roda para 6 produtos diferentes (bateria, alavanca, banco, rack, estação de cabo, leg press) e as imagens estão no corpo do PR.
- Se o Blender não estiver disponível no ambiente do agente, a frente **não** deve inventar outro caminho: registrar o bloqueio no PR e parar.

## Não faça

Não adicione dependência npm e não edite `src/`.

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

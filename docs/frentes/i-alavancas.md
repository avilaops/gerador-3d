# Frente I • Máquinas de alavanca e leg press

Origem: blueprint, frente B, itens 3 a 6. Os agachamentos, a panturrilha e a remada solo seguem muito longe da foto.

## Objetivo

Modelar bem, uma vez, os mecanismos de anilha que se repetem, com articulação verdadeira e sem colisão.

## Pode editar

- `src/families/plateLoadedLever.ts`
- `src/families/legPress.ts`
- `src/families/machine/` (inteiro)
- `tests/levers.test.ts` (novo)
- `docs/frentes/i-alavancas.md` (este arquivo)

## Entregas

1. Agachamento de alavanca: búlgaro, pêndulo e sumô, com braço, contrapeso, plataforma e pegadas na proporção da foto.
2. Leg press 45° e 90° e hack, com carro, trilhos, apoio lombar e suporte de anilhas.
3. Panturrilha em pé e sentada, remada solo, cavalinho (T-bar) e remada sentada articulada.
4. Cinemática correta: pivôs com bucha, braços com arco certo, curso limitado pela geometria.
5. Tratar as colisões de movimento que o manifesto reporta, **em vez** de reduzir o curso com `swingScale`.

## Itens para conferir contra a foto (Core)

LD-WH001 a 003, 034 a 039, 046, 053, 057, 058, 065 e 066, e os equivalentes do Premium (LD-A023 a A041).

## Critério de aceite

- Os gates de caixa, piso, articulação e colisão passam, e a lista de itens escalados por malha encolhe (informe quantos eram e quantos ficaram).
- Imagens antes e depois de 6 itens no corpo do PR.

## Não faça

Não edite `src/families/selectorizedTower.ts` (frente H), `classify.ts` nem o esquema. Se a remoção de um `swingScale` em `classify.ts` for possível, **liste** os códigos no PR; a edição é feita na integração.

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

# Frente C • Biblioteca de detalhes

Origem: blueprint, frente C. É o que separa "modelo" de "produto": parafuso, solda, tampa, costura.

## Objetivo

Criar uma biblioteca de peças de detalhe, instanciáveis e baratas em triângulos, que as famílias possam usar depois. **Esta frente não integra nas famílias**; ela só entrega a biblioteca.

## Pode editar

- `src/parts/details/` (novo, com seu próprio `index.ts`)
- `tests/details.test.ts` (novo)
- `docs/frentes/c-biblioteca-detalhes.md` (este arquivo)

## Entregas

Funções com a mesma convenção de `src/parts/primitives.ts` (recebem `PartKit`, devolvem malha ou grupo, materiais por papel):

1. Parafusos e porcas: sextavado, allen e abaulado, com arruela.
2. Tampa de tubo (redonda e retangular) e ponteira plástica.
3. Sapata de borracha com rosca e nivelador.
4. Cordão de solda sobre uma junta (geometria leve ou normal map, à escolha, justificando).
5. Costura e vinco para estofado, com espessura de espuma.
6. Pegada com ranhura e anel de borracha; rolo de espuma com tampa.
7. Chapa antiderrapante e chapa furada.
8. Roldana com garfo, argola e mosquetão.

## Critério de aceite

- Tudo reaproveita geometria e material entre instâncias (nenhuma peça duplica buffer).
- Cada peça tem teste de validade (sem NaN, normais corretas, caixa envolvente esperada) e orçamento de triângulos documentado.
- Nenhuma peça tem aresta viva de 90° onde a peça real tem raio.

## Não faça

Não edite `src/parts/primitives.ts`, `kit.ts` nem as famílias. Não edite `src/index.ts`.

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

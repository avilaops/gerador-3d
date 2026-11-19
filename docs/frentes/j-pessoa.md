# Frente J • Pessoa e movimento

Origem: blueprint, frente G. A figura de 1,75 m serve de escala, mas não de realismo.

## Objetivo

Trocar a figura de segmentos por um manequim com malha suave, mantendo o contrato de pose das famílias.

## Pode editar

- `src/viewer/figure.ts`
- `src/parts/pose.ts`
- `tests/figure.test.ts` (novo)
- `docs/frentes/j-pessoa.md` (este arquivo)

## Entregas

1. Manequim procedural com malha suave (cápsulas e superfícies de revolução ligadas por juntas), sem asset externo e sem arquivo binário.
2. Materiais de pele neutra e roupa de treino, com opção de ocultar a pessoa.
3. Poses por exercício a partir do nó `pose_hip` que as famílias já marcam; mãos e pés continuam resolvidos a cada quadro pelo alcance dos braços e das pernas.
4. Proporções de adulto de 1,75 m, com pés e mãos que não atravessam a máquina nos itens atuais.

## Critério de aceite

- O contrato de `src/parts/pose.ts` (nó `pose_hip`, +Z local é a frente) não muda: nenhuma família precisa ser editada.
- Imagens da pessoa em 6 equipamentos diferentes no corpo do PR.
- Sem queda de desempenho perceptível com a pessoa ligada.

## Não faça

Não edite famílias nem o resto do viewer (`EquipmentViewer.ts` é da frente E). Se precisar de um gancho novo no viewer, descreva no PR.

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

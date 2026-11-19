# Frente B • Camada de peças declarativas por produto

Origem: blueprint, frente B, item 1. Hoje o produto escolhe família e mecanismo. Falta como refinar um item pela foto sem escrever uma família nova.

## Objetivo

Permitir que o `spec` de um produto declare uma lista de peças que **estende ou substitui** o que a família gera.

## Pode editar

- `src/spec/schema.ts` (somente esta frente altera o esquema)
- `src/generate.ts`
- `src/parts/custom/` (novo)
- `tests/custom-parts.test.ts` (novo)
- `docs/frentes/b-pecas-por-produto.md` (este arquivo)

## Entregas

1. Campo opcional `parts` no spec, com `mode: 'extend' | 'replace'` e uma lista de peças: tubo por caminho (com raio de curva), caixa, cilindro, chapa, estofado, anilha e roldana. Cada peça tem papel de material, nome de nó estável e posição na convenção do gerador (metros, Y para cima, frente em +Z).
2. Validação com mensagens claras em português (zod).
3. Construção das peças reaproveitando as funções de `src/parts/primitives.ts` e `assemblies.ts` **sem editá-los**.
4. As peças entram no ajuste à caixa, no piso, no teste de articulações e na contagem de triângulos como qualquer outra.
5. Um spec de exemplo escrito à mão usando `parts`, em `src/parts/custom/` (não em `catalogs/`).

## Critério de aceite

- Spec sem `parts` gera exatamente o mesmo resultado de hoje (os 687 testes seguem passando).
- Spec com `parts` em modo `replace` e em modo `extend` passa nos gates de caixa, piso e orçamento.
- Erro de peça inválida aponta o caminho do campo.

## Não faça

Não altere as famílias (`src/families/`). Elas são de outras frentes.

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

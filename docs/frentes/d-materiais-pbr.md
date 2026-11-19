# Frente D • Materiais PBR

Origem: blueprint, frente D. Hoje todo material é cor, rugosidade e metal constantes.

## Objetivo

Trocar a cor chapada por material com mapas, mantendo a API do `PartKit` e os papéis de material como estão.

## Pode editar

- `src/parts/kit.ts`
- `src/parts/decals.ts`
- `src/parts/primitives.ts` (**somente** para gerar UV onde falta; não mude formas nem assinaturas)
- `src/parts/materials/` (novo)
- `tests/materials.test.ts` (novo)
- `docs/frentes/d-materiais-pbr.md` (este arquivo)

## Entregas

1. Texturas **procedurais** (canvas, que já existe no Node via `@napi-rs/canvas`): normal, rugosidade e oclusão. Sem dependência nova e sem arquivo binário no repositório. Se usar conjunto externo, só com licença livre registrada.
2. Tinta pó preta, que é o acabamento da maioria do Core: micro-rugosidade e leve variação, reflexo largo e baixo.
3. Cromado e aço escovado, couro sintético com poro e costura, borracha, espuma, chapa antiderrapante.
4. UV para tubo curvado e vigas, onde hoje falta.
5. Continuar `MeshStandardMaterial`: é o que o USDZ aceita. Validar que mapas de base, normal e rugosidade passam no `USDZExporter` e no validador da Khronos.

## Critério de aceite

- Nenhum papel de material some nem muda de nome; as famílias não precisam mudar.
- Textura tileável de no máximo 512 px; o GLB de cada modelo continua dentro do limite de 1,5 MB (se não couber, explique no PR com números).
- Os testes de exportação e de validador continuam passando.
- Imagens antes e depois de pelo menos 6 produtos no corpo do PR.

## Não faça

Não altere as famílias, o viewer nem o esquema.

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

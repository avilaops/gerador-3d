# Frente G • Exportação, LOD e compressão

Origem: blueprint, frente F. Detalhe real pede mais triângulos, então níveis de detalhe e compressão têm que existir antes.

## Objetivo

Exportar cada modelo em três níveis de detalhe, com malha comprimida, dentro de orçamentos por nível.

## Pode editar

- `src/export/`
- `src/lod.ts`
- `scripts/export.ts`
- `package.json` e `package-lock.json` (**somente esta frente** pode alterá-los, e só para a dependência de compressão)
- `tests/export-lod.test.ts` (novo)
- `docs/frentes/g-export-lod.md` (este arquivo)

## Entregas

1. Três níveis por modelo: `model.glb` (alto, ficha e AR), `model.lod1.glb` (visualizador) e `model.lod2.glb` (simulador com dezenas de itens). A redução usa o que já existe em `src/lod.ts` ou a estende.
2. Compressão de malha com meshopt, via `@gltf-transform/*` e `meshoptimizer`. Textura KTX2 só se a ferramenta `toktx` estiver presente; senão, deixar documentado como opcional.
3. Orçamentos por nível, testados: alto até 120 mil triângulos, médio até 40 mil, baixo até 10 mil, com tamanho máximo de arquivo por nível, ajustáveis em um único lugar.
4. Campos novos no manifesto por modelo (arquivos por nível, triângulos, bytes). O manifesto atual continua válido para quem só lê os campos antigos.
5. O USDZ continua estático e sem compressão. Documentar que o consumidor precisa do decodificador meshopt para ler os GLB comprimidos.

## Critério de aceite

- O validador da Khronos aprova os três níveis.
- O GLB padrão sem compressão continua gerável por opção, para o site atual não quebrar.
- Tabela no PR com triângulos e bytes antes e depois para 6 produtos.

## Não faça

Não altere famílias, viewer nem materiais.

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

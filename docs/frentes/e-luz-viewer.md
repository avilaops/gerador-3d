# Frente E • Luz e render do visualizador

Origem: blueprint, frente E, itens 1 a 4 e 7. É o maior ganho visual pelo menor custo.

## Objetivo

Trocar o `RoomEnvironment` genérico e a sombra simples por iluminação de estúdio e sombra de contato, **sem atualizar o Three.js** (isso é a frente K).

## Pode editar

- `src/viewer/EquipmentViewer.ts`
- `src/viewer/camera.ts`
- `src/viewer/lighting/` (novo)
- `web/render.ts`
- `tests/viewer-lighting.test.ts` (novo)
- `docs/frentes/e-luz-viewer.md` (este arquivo)

## Entregas

1. Ambiente de estúdio: cena procedural de softbox grande e fundo neutro convertida com PMREM, no lugar do `RoomEnvironment`. Preferir procedural a arquivo HDRI; se usar arquivo, no máximo 300 KB, licença livre (CC0) registrada.
2. Três pontos de luz calibrados: principal larga e suave, preenchimento fraco, contraluz que desenha a silhueta.
3. Sombra de contato: textura de oclusão sob o equipamento, calculada a partir da projeção em planta (`src/footprint.ts`, só leitura), no lugar de depender só do mapa de sombra.
4. Antialias de qualidade e exposição calibrada para que os pretos não sumam. Efeitos caros ficam atrás de uma opção `quality`, desligada por padrão em celular.
5. Variantes de cena: fundo claro, fundo escuro e piso de academia (opção do construtor, padrão atual preservado).

## Critério de aceite

- O padrão atual do visualizador continua disponível e é o padrão até alguém trocar de propósito.
- Mantém o comportamento que já existe: render sob demanda, pausa fora da viewport, recuperação de perda de contexto WebGL.
- Imagens antes e depois de 6 produtos, claros e escuros, no corpo do PR.
- Sem queda de desempenho em modo celular (medir e informar).

## Não faça

Não atualize o Three.js, não altere materiais (`kit.ts`) nem famílias.

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

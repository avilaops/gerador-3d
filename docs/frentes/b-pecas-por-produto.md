# Frente B • Camada de peças declarativas por produto

Origem: blueprint, frente B, item 1. Hoje o produto escolhe família e mecanismo e só refina parâmetros. Falta como corrigir um item pela foto sem escrever uma família nova.

## Objetivo

Permitir que o `spec` de um produto declare uma lista de peças que **estende ou substitui** o que a família gera, com articulações próprias no modo de substituição.

## Pode editar

- `src/spec/schema.ts` (somente esta frente altera o esquema)
- `src/generate.ts`
- `src/parts/custom/` (novo)
- `tests/custom-parts.test.ts` (novo)
- `docs/frentes/b-pecas-por-produto.md` (este arquivo) e `docs/frentes/evidencias/b-pecas-por-produto/`

## Contexto no código (verificado)

- `generateEquipment` (`src/generate.ts`) monta o modelo em `buildWith(design)`: mescla `family.defaults` com `spec.params`, valida com `family.paramsSchema` e chama `family.build`. Esse é o ponto de entrada das peças.
- Há um **laço de ajuste à caixa** (`FIT_ITERATIONS`, `FIT_TOLERANCE`): se a caixa passa de 1%, a família é remontada com dimensões de projeto corrigidas; só o que sobra vira escala de malha, com aviso. As peças novas precisam entrar nesse laço, senão o ajuste ignora metade do modelo.
- `generate` ignora o `pivot` de `spec.articulations` ("pivot é definido pela geometria da família"). No modo `replace` não há família para definir pivô, então as peças precisam trazer as próprias articulações.
- `Rig` (`src/parts/rig.ts`) tem `group`, `tube`, `rod`, `path`, `box`, `pad`, `roller`, `grip`, `horn`, `plate`, `foot` e `arm`. Reaproveite; **não edite**.
- `src/parts/primitives.ts` tem `box`, `beam`, `bentTube`, `upholstery`, `pulley`, `cable`, `plateHorn`. Só leitura (é da frente D).
- Convenção: metros, Y para cima, frente em +Z, origem no centro da projeção no piso. Nós com nomes estáveis.

## Forma sugerida do campo (ajuste se achar melhor, justificando)

```ts
parts?: {
  mode: 'extend' | 'replace';
  items: Array<
    | { kind: 'tube'; name: string; points: Vec3[]; size: number | [number, number]; round?: boolean; radius?: number; material?: Role }
    | { kind: 'box' | 'cylinder' | 'plate' | 'pad' | 'roller' | 'pulley'; name: string; /* geometria */ }
  >;
  articulations?: Articulation[]; // só no modo replace
}
```

## Etapas

1. Esquema zod com mensagens de erro em português e caminho do campo (`parts.items.3.points`).
2. Construtor das peças em `src/parts/custom/`, chamado de dentro de `buildWith`, com as peças contando para a caixa e para o laço de ajuste.
3. Modo `extend`: soma as peças ao que a família gerou. Modo `replace`: **não chama** `family.build` e usa só as peças e as articulações declaradas.
4. Avisos (`warnings`) para nome de nó repetido e para articulação que aponta para nó inexistente.
5. Spec de exemplo escrito à mão em `src/parts/custom/` (não em `catalogs/`), com uma torre simples em `replace`.
6. Documentar o campo no próprio arquivo do esquema.

## Testes

- **Sem `parts`, nada muda**: para 5 specs de famílias diferentes, árvore de nós e contagem de triângulos idênticas às de `main`.
- `extend` aumenta a contagem de triângulos e continua dentro da caixa e do piso.
- `replace` com articulação própria passa nos gates de caixa, piso e articulação.
- Erros: ponto com valor não numérico, nó duplicado, `replace` sem peças. Cada um aponta o caminho do campo.

## Riscos

- Mudar `buildWith` pode alterar o resultado de quem não usa `parts`: o teste "nada muda" é a trava.
- Peças fora da caixa em `replace` fazem o laço de ajuste divergir: limitar iterações e avisar.

## Fora de escopo

Alterar famílias (`src/families/`), o viewer ou o catálogo. Escrever specs reais de produto: isso vem depois, na integração.

## Critério de aceite

- Os testes que já existem continuam passando sem alteração.
- Spec com `parts` nos dois modos passa nos gates de caixa, piso, articulação e orçamento.

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

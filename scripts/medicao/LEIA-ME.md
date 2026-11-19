# Medição foto × modelo

Mede o quanto cada modelo do gerador se parece com a foto do produto, ordena do pior para o melhor e protege contra mudança de forma sem querer.

## Requisitos

- Node 22 ou mais novo e `npm install` feito.
- Chrome ou Edge instalado (a variável `CHROME_PATH` aponta outro navegador).
- Rede para baixar as fotos na primeira vez, ou uma pasta local com `<codigo>.<ext>` (WebP, PNG ou JPEG).

## Medir

```bash
npx vite-node scripts/medicao/cli.ts -- --catalog ludus-core
npx vite-node scripts/medicao/cli.ts -- --catalog ludus --only LD-B004,LD-A002 --saida ./saida
```

Saída: `relatorio.json` e `relatorio.html` (folha de contato, pior primeiro). Opções no cabeçalho de `cli.ts`.

As fotos ficam fora do repositório: o cache vai para `<pasta temporária>/gerador-medicao/fotos`. A origem padrão é a vitrine publicada (`https://ludusequipamentos.com/midias/produtos/<codigo>`); `--origem <pasta>` usa fotos locais.

## Como a nota é calculada

1. A foto vira uma silhueta (`fotoParaMascara`): fundo liso estimado pela borda, sombra clara do piso ligada à borda descartada, buracos do quadro vistos através contados como fundo.
2. A foto não traz o ponto de vista. O modelo é renderizado em vários azimutes (padrão: -80 a 80, de 20 em 20) e a foto também é testada **espelhada**, porque o lado em que o equipamento aparece varia. Vale a melhor combinação, e o relatório registra qual foi.
3. As duas silhuetas são recortadas na caixa, encaixadas num quadro de 128 px mantendo a proporção, e comparadas por IoU.
4. **`nota = IoU × proporção`.** A proporção é a razão entre as razões de aspecto das caixas. O `silhueta.py` antigo recortava cada contorno na própria caixa e por isso não via forma esticada; aqui ela é penalizada.
5. O relatório traz também o IoU de três faixas (topo, meio, base), para ver onde diverge.

## Como ler a nota

- **Serve para ordenar e para comparar antes e depois.** Não aprova ninguém.
- Nota é limite superior de semelhança: o modelo tem a melhor vista entre as testadas, e a nota não mede detalhe interno, cor nem material.
- A coluna **confiança da foto** avisa quando a segmentação provavelmente falhou. Nota baixa com confiança baixa pode ser a máscara, não o modelo.
- **Limitação conhecida:** equipamento branco ou prata muito claro pode perder partes na segmentação, porque se confunde com o fundo e a sombra.

## Regressão visual

```bash
npx vite-node scripts/medicao/regressao-cli.ts -- aprovar   --catalog ludus-core
npx vite-node scripts/medicao/regressao-cli.ts -- verificar --catalog ludus-core
```

Grava a silhueta aprovada de cada modelo numa vista fixa e acusa quando um modelo muda além da tolerância (padrão: 2% da união). Aprovar uma mudança é o comando `aprovar`. Compara forma, não cor: mudança de material ou de luz não dispara. As referências ficam em `tests/visual/referencias/<catalogo>/`.

Mudar a vista (`VISTA_REFERENCIA`) invalida todas as referências. Ao mesclar frentes que mudam o modelo, regenere as referências uma vez.

## Testes

`npx vitest run tests/visual` cobre as funções puras, a E/S e o fluxo de `medirItem` com um renderizador falso, sem navegador.

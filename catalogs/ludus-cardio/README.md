# Ludus Cardio

Specs da linha de cardio (LD-C001 a LD-C028): 7 esteiras, 1 simulador de escada, 10 bicicletas
(5 verticais e 5 horizontais), 3 bicicletas de spinning e 7 elípticos (5 de transmissão traseira e 2 de
movimento adaptativo).

- `products.json`: medidas, peso e modelo do fabricante, vindos da planilha comercial de cardio. Sem preços.
- `classify.ts`: família, variante e tela de cada código, conferidas contra a foto do fabricante.
- Famílias novas em `src/families/cardio/`: `treadmill`, `bike`, `elliptical`, `stair-climber`.

A geometria é paramétrica e deve ser revisada contra a foto e a ficha técnica antes de publicação comercial.
Estes modelos **não têm movimento animado** (pedais, esteira e degraus ficam parados); a pose de uso (pessoa de pé
ou sentada) vem da marca `pose_hip` de cada família.

Gerar: `npm run specs -- --catalog ludus-cardio` e depois a exportação do catálogo.

#!/usr/bin/env bash
# Publica a galeria em https://ludus.avilaops.com (servidor "applications", Caddy, /var/www).
# O build roda aqui; para o servidor só vão os arquivos estáticos.
# Uso: npm run deploy   (precisa do host "applications" no ~/.ssh/config)
set -euo pipefail
HOST="${DEPLOY_HOST:-applications}"
DIR=/var/www/ludus.avilaops.com

npm test
npx vite build
rm -f dist/render.html
ssh -o BatchMode=yes "$HOST" "mkdir -p $DIR && rm -rf $DIR/assets"
scp -q -o BatchMode=yes -r dist/* "$HOST:$DIR/"
code=$(curl -s -o /dev/null -w '%{http_code}' https://ludus.avilaops.com/)
echo "https://ludus.avilaops.com respondeu $code"
[ "$code" = 200 ]

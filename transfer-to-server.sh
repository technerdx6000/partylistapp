#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 user@server [/opt/listcollab]" >&2
    exit 1
fi

SERVER="$1"
REMOTE_DIR="${2:-/opt/listcollab}"

echo "Transferring ListCollab to $SERVER:$REMOTE_DIR"

ssh "$SERVER" "mkdir -p '$REMOTE_DIR'"

rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.turbo' \
  --exclude 'coverage' \
  --exclude 'dist' \
  --exclude 'playwright-report' \
  --exclude 'test-results' \
  --exclude '.env' \
  --exclude '.env.*' \
  ./ "$SERVER:$REMOTE_DIR/"

ssh "$SERVER" "chmod +x '$REMOTE_DIR'/*.sh '$REMOTE_DIR'/scripts/*.sh 2>/dev/null || true"

cat <<EOF
Transfer complete.

Next steps on the server:
1. Create an external env file such as /etc/listcollab/listcollab.env.
2. Set LISTCOLLAB_ENV_FILE=/etc/listcollab/listcollab.env.
3. Run $REMOTE_DIR/deploy.sh.
4. Place the reverse-proxy config from deploy/nginx/ in your TLS proxy.
EOF

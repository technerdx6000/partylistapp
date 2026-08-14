#!/bin/bash

# Transfer script for deploying to remote server
# Usage: ./transfer-to-server.sh user@server-ip

if [ $# -eq 0 ]; then
    echo "Usage: $0 user@server-ip"
    echo "Example: $0 admin@192.168.1.100"
    exit 1
fi

SERVER=$1
REMOTE_DIR="/opt/partylist"

echo "🚀 Transferring Party List application to $SERVER"

# Create remote directory
ssh $SERVER "sudo mkdir -p $REMOTE_DIR && sudo chown \$(whoami):\$(whoami) $REMOTE_DIR"

# Transfer files
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '*.log' \
  ./ $SERVER:$REMOTE_DIR/

echo "📁 Files transferred to $SERVER:$REMOTE_DIR"

# Make scripts executable
ssh $SERVER "chmod +x $REMOTE_DIR/*.sh"

echo "✅ Transfer complete!"
echo ""
echo "Next steps:"
echo "1. SSH to your server: ssh $SERVER"
echo "2. Navigate to app directory: cd $REMOTE_DIR"
echo "3. Configure environment: cp .env.production .env && nano .env"
echo "4. Deploy application: ./deploy.sh"

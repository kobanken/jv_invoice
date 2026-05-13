#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

REMOTE_TARGET="${REMOTE_TARGET:-xserver-jv-invoice}"
REMOTE_ROOT="${REMOTE_ROOT:-suncodejapan.com/public_html/invoice.suncodejapan.com}"
ADMIN_REMOTE_DIR="${ADMIN_REMOTE_DIR:-admin}"
API_REMOTE_DIR="${API_REMOTE_DIR:-api}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/jv_invoice.key}"
SSH_PORT="${SSH_PORT:-10022}"
SSH_CONTROL_PATH="${SSH_CONTROL_PATH:-/tmp/jv-invoice-deploy-%r@%h:%p}"
BUILD_DIR="${BUILD_DIR:-out}"
SKIP_BUILD="${SKIP_BUILD:-0}"
DRY_RUN="${DRY_RUN:-0}"

usage() {
  cat <<'EOF'
Usage:
  ./deploy_xserver.sh

Optional environment variables:
  REMOTE_TARGET="xserver-jv-invoice"  # SSH host alias from ~/.ssh/config
  REMOTE_ROOT="suncodejapan.com/public_html/invoice.suncodejapan.com"
  ADMIN_REMOTE_DIR="admin"
  API_REMOTE_DIR="api"
  SSH_KEY="$HOME/.ssh/jv_invoice.key"
  SSH_PORT="10022"
  SSH_CONTROL_PATH="/tmp/jv-invoice-deploy-%r@%h:%p"
  SKIP_BUILD="1"                      # skip npm run build
  DRY_RUN="1"                         # show rsync changes without uploading

Before first use, if the key has a passphrase:
  ssh-add ~/.ssh/jv_invoice.key
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_command npm
require_command ssh
require_command rsync

cd "$PROJECT_ROOT"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found: $SSH_KEY" >&2
  exit 1
fi

SSH_CMD=(
  ssh
  -p "$SSH_PORT"
  -i "$SSH_KEY"
  -o IdentitiesOnly=yes
  -o ControlMaster=auto
  -o ControlPersist=10m
  -o ControlPath="$SSH_CONTROL_PATH"
)
RSYNC_SHELL="$(printf '%q ' "${SSH_CMD[@]}")"
RSYNC_SHELL="${RSYNC_SHELL% }"

if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "Building static React app for /admin ..."
  NEXT_PUBLIC_APP_BASE_PATH="/admin" NEXT_PUBLIC_API_BASE_URL="/api" npm run build
fi

ADMIN_SOURCE="$BUILD_DIR"
if [[ -d "$BUILD_DIR/admin" ]]; then
  ADMIN_SOURCE="$BUILD_DIR/admin"
fi

if [[ ! -d "$ADMIN_SOURCE" ]]; then
  echo "Build output directory not found: $ADMIN_SOURCE" >&2
  exit 1
fi

if [[ ! -d "public_html/api" ]]; then
  echo "API directory not found: public_html/api" >&2
  exit 1
fi

REMOTE_ADMIN_PATH="\$HOME/$REMOTE_ROOT/$ADMIN_REMOTE_DIR"
REMOTE_API_PATH="\$HOME/$REMOTE_ROOT/$API_REMOTE_DIR"

echo "Ensuring remote directories exist..."
"${SSH_CMD[@]}" "$REMOTE_TARGET" "mkdir -p \"$REMOTE_ADMIN_PATH\" \"$REMOTE_API_PATH\""

COMMON_RSYNC_ARGS=(
  -avz
  --checksum
  --omit-dir-times
  -e "$RSYNC_SHELL"
)

if [[ "$DRY_RUN" == "1" ]]; then
  COMMON_RSYNC_ARGS+=(--dry-run)
fi

echo "Deploying admin static files to $REMOTE_TARGET:$REMOTE_ROOT/$ADMIN_REMOTE_DIR ..."
rsync "${COMMON_RSYNC_ARGS[@]}" \
  --delete \
  "$ADMIN_SOURCE"/ \
  "$REMOTE_TARGET:$REMOTE_ADMIN_PATH/"

echo "Deploying PHP API to $REMOTE_TARGET:$REMOTE_ROOT/$API_REMOTE_DIR ..."
rsync "${COMMON_RSYNC_ARGS[@]}" \
  --delete \
  --exclude "config/.env" \
  --exclude "config/*.local.php" \
  "public_html/api"/ \
  "$REMOTE_TARGET:$REMOTE_API_PATH/"

echo "Deployment completed."
echo "Admin: https://invoice.suncodejapan.com/admin/"
echo "API health: https://invoice.suncodejapan.com/api/health.php"

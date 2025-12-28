#!/usr/bin/env bash

set -e

# ===== CONFIG =====
CERT_DIR="$HOME/MagicMirror/modules/MMM-Chores/certs"

# ==================

echo "Detecting primary IPv4 address..."

IP_ADDRESS=$(ip route get 1 | awk '{print $7; exit}')

if [ -z "$IP_ADDRESS" ]; then
  echo "ERROR: Could not detect IP address"
  exit 1
fi

echo "Detected IP: $IP_ADDRESS"
echo ""

echo "Creating cert directory..."
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

echo "Generating private key (server.key)..."
openssl genrsa -out server.key 2048

echo "Generating certificate signing request (server.csr)..."
openssl req -new -key server.key -out server.csr -subj "/C=SE/ST=Stockholm/L=Stockholm/O=Home/CN=${IP_ADDRESS}"
openssl x509 -req -in server.csr -signkey server.key -out server.crt -days 365

echo ""
echo "✔ Certificate generation complete"
echo ""
echo "Files created:"
echo " - $CERT_DIR/server.key"
echo " - $CERT_DIR/server.csr"
echo " - $CERT_DIR/server.crt"
echo ""
echo "NEXT STEPS:"
echo "1. restart magic mirror"
echo "2. Open: https://${IP_ADDRESS}:5004"
echo ""

#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=== Building Backend Dependencies ==="
pip install -r requirements.txt

echo "=== Building Frontend React SPA ==="
npm install --prefix client
npm run build --prefix client

echo "=== Build Completed Successfully ==="

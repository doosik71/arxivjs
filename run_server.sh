#!/bin/bash
cd "$(dirname "$0")"

echo "Connect https://8765-$(gcloud config get-value project).cloudshell.dev for google cloud shell"

npm run dev -- --host 0.0.0.0 --port 8765

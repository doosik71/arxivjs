#!/bin/bash

cd "$(dirname "$0")"

HOST="localhost"
# HOST="0.0.0.0"
PORT="8766"
TARGET="http://localhost:8765"

npm run dev

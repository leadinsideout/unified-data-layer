#!/bin/bash

# Test if server starts successfully

echo "Starting server..."
NODE_ENV=development PORT=3000 node api/server.js &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
echo "Waiting for server to start..."
sleep 5

echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)

echo "Health response: $HEALTH_RESPONSE"

echo "Killing server..."
kill $SERVER_PID

if [[ $HEALTH_RESPONSE == *"operational"* ]]; then
  echo "✅ Server started successfully!"
  exit 0
else
  echo "❌ Server failed to start"
  exit 1
fi

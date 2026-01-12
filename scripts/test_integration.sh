#!/bin/bash
# UG Board Integration Test Suite
# Location: ugboard-youtube-puller/scripts/test-integration.sh

set -e  # Exit on error

echo "🧪 UG Board Integration Test Suite"
echo "================================="
echo "Date: $(date)"
echo ""

WORKER_URL="https://ugboard-youtube-puller.kimkp015.workers.dev"
ENGINE_URL="https://web-production-c6cb2.up.railway.app"

echo "1️⃣ Testing Worker Health Endpoint:"
echo "----------------------------------"
curl -s "${WORKER_URL}/health" | jq '.' || {
  echo "Health check failed"
  curl -s "${WORKER_URL}/health"
}
echo ""

echo "2️⃣ Testing Manual Trigger (default token 'test123'):"
echo "----------------------------------------------------"
RESPONSE=$(curl -s -X POST "${WORKER_URL}/admin/run-job" \
  -H "X-Manual-Trigger: test123" \
  -H "Content-Type: application/json")
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

echo "3️⃣ Testing Wrong Manual Token (should show endpoints):"
echo "------------------------------------------------------"
curl -s -X POST "${WORKER_URL}/admin/run-job" \
  -H "X-Manual-Trigger: wrongtoken" | jq '.endpoints?' 2>/dev/null || {
  curl -s -X POST "${WORKER_URL}/admin/run-job" \
    -H "X-Manual-Trigger: wrongtoken" | head -5
}
echo ""

echo "4️⃣ Testing Engine Direct Connection:"
echo "------------------------------------"
ENGINE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ENGINE_URL}/ingest/youtube" \
  -H "X-Internal-Token: 1994199620002019866" \
  -H "Content-Type: application/json" \
  -d '{"items":[]}' \
  --max-time 10)
echo "Engine HTTP Status: ${ENGINE_STATUS}"
echo ""

echo "5️⃣ System Status Summary:"
echo "-------------------------"
echo "Worker URL: ${WORKER_URL}"
echo "Engine URL: ${ENGINE_URL}"
echo "Test timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""
echo "✅ Test sequence complete"
echo ""
echo "Next: Check logs with: wrangler tail --format pretty"

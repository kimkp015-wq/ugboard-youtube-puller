# Save as monitor.sh
while true; do
  clear
  echo "UG Board Monitor - $(date -u)"
  echo "=============================="
  
  # Engine status
  ENGINE=$(curl -s "https://web-production-c6cb2.up.railway.app/" 2>/dev/null)
  echo -n "Engine: "
  echo "$ENGINE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "checking..."
  
  # Worker status  
  WORKER=$(curl -s "https://ugboard-youtube-puller.kimkp015.workers.dev/health" 2>/dev/null)
  echo -n "Worker: "
  echo "$WORKER" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "checking..."
  
  # Next cron
  MINUTE=$(date -u +%M)
  if [ $MINUTE -lt 30 ]; then
    NEXT="13:30"
  else
    NEXT="14:00"
  fi
  echo "Next cron: $NEXT UTC"
  
  sleep 60
done

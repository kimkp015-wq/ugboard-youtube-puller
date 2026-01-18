async function runYoutubePull(env: Env): Promise<{ success: boolean; message: string; status?: number }> {
  const engineBase = env.ENGINE_BASE_URL.replace(/\/+$/, '');
  const url = `${engineBase}/ingest/youtube`;

  if (!validateUrl(url)) {
    const error = `Invalid ENGINE_BASE_URL: ${url}`;
    console.error(JSON.stringify({ event: 'url_validation_failed', error }));
    return { success: false, message: error };
  }

  const payload = { 
    items: getSampleYouTubeData(),
    source: "worker_cron",
    timestamp: new Date().toISOString()
  };

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const requestId = crypto.randomUUID();
    const attemptStart = Date.now();

    try {
      console.log(JSON.stringify({
        event: 'engine_request_start',
        requestId,
        attempt,
        url,
        items_count: payload.items.length,
        timestamp: new Date().toISOString()
      }));

      // ✅ FIXED: Use Authorization header instead of X-Internal-Token
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer inject-ug-board-2025',  // ← CHANGED THIS LINE
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'User-Agent': 'UG-Board-YouTube-Cron/1.0'
        },
        body: JSON.stringify(payload)
      });

      // ... rest of function stays the same

    

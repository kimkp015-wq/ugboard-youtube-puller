export interface Env {
  ENGINE_BASE_URL: string;
  INTERNAL_TOKEN: string;
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ✅ ADD THIS: Sample YouTube data to send
function getSampleYouTubeData() {
  return [
    {
      id: "yt_sample_001",
      source: "youtube",
      external_id: "dQw4w9WgXcQ",  // Example video ID
      title: "Sample YouTube Video 1",
      artist: "Sample Artist",
      youtube_views: 1000,
      region: "Eastern",
      published_at: new Date().toISOString(),
      score: 0
    },
    {
      id: "yt_sample_002", 
      source: "youtube",
      external_id: "9bZkp7q19f0",  // Another example
      title: "Sample YouTube Video 2",
      artist: "Another Artist",
      youtube_views: 2000,
      region: "Northern",
      published_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      score: 0
    }
  ];
}

async function runYoutubePull(env: Env): Promise<{ success: boolean; message: string; status?: number }> {
  const engineBase = env.ENGINE_BASE_URL.replace(/\/+$/, '');
  const url = `${engineBase}/ingest/youtube`;

  if (!validateUrl(url)) {
    const error = `Invalid ENGINE_BASE_URL: ${url}`;
    console.error(JSON.stringify({ event: 'url_validation_failed', error }));
    return { success: false, message: error };
  }

  // ✅ FIXED: Send actual sample data instead of empty array
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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Internal-Token': env.INTERNAL_TOKEN,
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'User-Agent': 'UG-Board-YouTube-Cron/1.0'
        },
        body: JSON.stringify(payload)
      });

      const duration = Date.now() - attemptStart;
      const responseText = await response.text();

      console.log(JSON.stringify({
        event: 'engine_request_complete',
        requestId,
        attempt,
        status: response.status,
        ok: response.ok,
        durationMs: duration,
        response_preview: responseText.substring(0, 200),
        timestamp: new Date().toISOString()
      }));

      if (response.ok) {
        return {
          success: true,
          message: `Success! Engine returned ${response.status}: ${responseText}`,
          status: response.status
        };
      }

      console.warn(JSON.stringify({
        event: 'engine_request_failed',
        requestId,
        attempt,
        status: response.status,
        error: responseText.substring(0, 500),
        durationMs: duration
      }));

      if (response.status >= 400 && response.status < 500) {
        return {
          success: false,
          message: `Engine error ${response.status}: ${responseText}`,
          status: response.status
        };
      }
    } catch (error) {
      const duration = Date.now() - attemptStart;
      console.error(JSON.stringify({
        event: 'engine_request_error',
        requestId,
        attempt,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
        timestamp: new Date().toISOString()
      }));
    }

    if (attempt < maxRetries) {
      const delay = 500 * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const error = 'Failed to send payload to engine after all retries';
  console.error(JSON.stringify({ event: 'all_retries_exhausted', error }));
  return { success: false, message: error };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    
    if (url.pathname === '/health') {
      const responseData = {
        service: 'UG Board YouTube Cron Worker',
        version: '3.1-fixed',
        status: 'healthy',
        engine_url: env.ENGINE_BASE_URL,
        engine_url_valid: validateUrl(env.ENGINE_BASE_URL),
        has_internal_token: !!env.INTERNAL_TOKEN,
        cron_schedule: 'Every 30 minutes',
        next_cron_estimate: 'Next run in ~30 minutes',
        timestamp: new Date().toISOString(),
        requestId
      };

      return new Response(
        JSON.stringify(responseData, null, 2),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId
          }
        }
      );
    }

    // ✅ ADD MANUAL TRIGGER ENDPOINT FOR TESTING
    if (url.pathname === '/trigger') {
      const result = await runYoutubePull(env);
      
      return new Response(
        JSON.stringify({
          service: 'UG Board YouTube Worker',
          manual_trigger: true,
          success: result.success,
          message: result.message,
          engine_url: env.ENGINE_BASE_URL,
          timestamp: new Date().toISOString(),
          requestId
        }, null, 2),
        {
          status: result.success ? 200 : 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        service: 'UG Board YouTube Cron Worker',
        version: '3.1-fixed',
        description: 'Automated YouTube ingestion for UG Board Engine',
        endpoints: [
          {
            method: 'GET',
            path: '/health',
            description: 'Health check and configuration'
          },
          {
            method: 'GET', 
            path: '/trigger',
            description: 'Manual trigger for testing'
          }
        ],
        cron_schedule: 'Every 30 minutes',
        engine_url: env.ENGINE_BASE_URL,
        note: `Worker will send data to: ${env.ENGINE_BASE_URL}/ingest/youtube`,
        requestId,
        timestamp: new Date().toISOString()
      }, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      }
    );
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const cronId = crypto.randomUUID();
    const startTime = Date.now();

    console.log(JSON.stringify({
      event: 'cron_triggered',
      cronId,
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      engine_url: env.ENGINE_BASE_URL,
      timestamp: new Date().toISOString()
    }));

    const result = await runYoutubePull(env);
    const duration = Date.now() - startTime;

    console.log(JSON.stringify({
      event: result.success ? 'cron_success' : 'cron_failure',
      cronId,
      success: result.success,
      message: result.message,
      durationMs: duration,
      engine_status: result.status,
      timestamp: new Date().toISOString()
    }));
  }
};

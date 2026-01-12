export interface Env {
  ENGINE_BASE_URL: string;
  INTERNAL_TOKEN: string;
  // REMOVED: MANUAL_TRIGGER_TOKEN
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function runYoutubePull(env: Env): Promise<{ success: boolean; message: string; status?: number }> {
  const engineBase = env.ENGINE_BASE_URL.replace(/\/+$/, '');
  const url = `${engineBase}/ingest/youtube`;

  if (!validateUrl(url)) {
    const error = `Invalid ENGINE_BASE_URL: ${url}`;
    console.error(JSON.stringify({ event: 'url_validation_failed', error }));
    return { success: false, message: error };
  }

  const payload = { items: [] };
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
        error: responseText.substring(0, 200),
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
    
    // SIMPLE HEALTH CHECK ONLY
    if (url.pathname === '/health') {
      const responseData = {
        service: 'UG Board YouTube Cron Worker',
        version: '3.0-cron-only',
        status: 'healthy',
        engine_url_set: !!env.ENGINE_BASE_URL,
        has_internal_token: !!env.INTERNAL_TOKEN,
        cron_schedule: 'Every 30 minutes (e.g., 2:00, 2:30, 3:00)',
        note: 'Cron-only operation - no manual triggers',
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

    // DEFAULT RESPONSE - SIMPLE INFO
    return new Response(
      JSON.stringify({
        service: 'UG Board YouTube Cron Worker',
        version: '3.0-cron-only',
        description: 'Automated YouTube ingestion via cron schedule',
        endpoints: [
          {
            method: 'GET',
            path: '/health',
            description: 'Health check and status'
          }
        ],
        cron_schedule: 'Every 30 minutes',
        note: 'This worker runs automatically on schedule. No manual triggers.',
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

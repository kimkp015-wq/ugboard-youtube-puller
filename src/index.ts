export interface Env {
  ENGINE_BASE_URL: string;
  INTERNAL_TOKEN: string;
  MANUAL_TRIGGER_TOKEN?: string;
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
    console.error(JSON.stringify({ event: 'url_validation_failed', error, url }));
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
          'User-Agent': 'UG-Board-YouTube-Puller/1.0'
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
    const startTime = Date.now();
    const manualToken = env.MANUAL_TRIGGER_TOKEN || 'test123';
    const receivedToken = request.headers.get('X-Manual-Trigger');

    console.log(JSON.stringify({
      event: 'http_request_start',
      requestId,
      method: request.method,
      path: url.pathname,
      hasManualToken: !!env.MANUAL_TRIGGER_TOKEN,
      tokenSource: env.MANUAL_TRIGGER_TOKEN ? 'environment' : 'default',
      timestamp: new Date().toISOString()
    }));

    // Health check endpoint
    if (url.pathname === '/health') {
      const responseData = {
        status: 'healthy',
        engine_url_set: !!env.ENGINE_BASE_URL,
        has_internal_token: !!env.INTERNAL_TOKEN,
        has_manual_token: !!env.MANUAL_TRIGGER_TOKEN,
        manual_token_source: env.MANUAL_TRIGGER_TOKEN ? 'environment' : 'default (test123)',
        version: '2.3-production',
        timestamp: new Date().toISOString(),
        requestId
      };

      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        event: 'health_check',
        requestId,
        ...responseData,
        durationMs: duration
      }));

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

    // Manual trigger endpoint
    if (url.pathname === '/admin/run-job') {
      console.log(JSON.stringify({
        event: 'manual_trigger_attempt',
        requestId,
        receivedToken: receivedToken ? 'present' : 'missing',
        expectedToken: manualToken,
        tokenMatch: receivedToken === manualToken,
        timestamp: new Date().toISOString()
      }));

      if (receivedToken === manualToken) {
        console.log(JSON.stringify({
          event: 'manual_trigger_authorized',
          requestId,
          timestamp: new Date().toISOString()
        }));

        const result = await runYoutubePull(env);
        const duration = Date.now() - startTime;

        const responseData = {
          success: result.success,
          message: result.message,
          requestId,
          timestamp: new Date().toISOString(),
          durationMs: duration,
          token_source: env.MANUAL_TRIGGER_TOKEN ? 'environment' : 'default',
          engine_status: result.status
        };

        console.log(JSON.stringify({
          event: result.success ? 'manual_trigger_success' : 'manual_trigger_failed',
          requestId,
          ...responseData
        }));

        return new Response(
          JSON.stringify(responseData, null, 2),
          {
            status: result.success ? 200 : (result.status || 500),
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId
            }
          }
        );
      }
    }

    // Default response (when no endpoint matches)
    const duration = Date.now() - startTime;
    const responseData = {
      service: 'UG Board YouTube Puller Worker',
      version: '2.3-production',
      endpoints: [
        {
          method: 'GET',
          path: '/health',
          description: 'Health check and configuration status'
        },
        {
          method: 'POST',
          path: '/admin/run-job',
          description: 'Manual ingestion trigger',
          required_header: 'X-Manual-Trigger',
          note: env.MANUAL_TRIGGER_TOKEN 
            ? 'Token configured in environment' 
            : 'Using default token: test123'
        }
      ],
      cron_schedule: 'Every 30 minutes (e.g., 2:00, 2:30, 3:00)',
      configuration: {
        engine_url_configured: !!env.ENGINE_BASE_URL,
        internal_token_configured: !!env.INTERNAL_TOKEN,
        manual_token_configured: !!env.MANUAL_TRIGGER_TOKEN
      },
      requestId,
      timestamp: new Date().toISOString(),
      durationMs: duration
    };

    console.log(JSON.stringify({
      event: 'default_response',
      requestId,
      path: url.pathname,
      durationMs: duration
    }));

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

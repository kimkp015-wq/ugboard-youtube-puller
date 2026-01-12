export interface Env {
  ENGINE_BASE_URL: string;
  INTERNAL_TOKEN: string;
  MANUAL_TRIGGER_TOKEN?: string;  // ← Make optional
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function runYoutubePull(env: Env): Promise<{ success: boolean; message: string }> {
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
    try {
      console.log(JSON.stringify({
        event: 'engine_request_attempt',
        attempt,
        url,
        timestamp: new Date().toISOString()
      }));

      // ✅ CORRECT HEADERS - X-Internal-Token not Authorization
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Internal-Token': env.INTERNAL_TOKEN,  // ← CHANGED
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID()
        },
        body: JSON.stringify(payload)
      });

      console.log(`ENGINE STATUS (attempt ${attempt}):`, response.status);

      if (response.ok) {
        const responseText = await response.text();
        return {
          success: true,
          message: `Success! Engine returned ${response.status}: ${responseText}`
        };
      }

      const errorText = await response.text();
      console.warn(`Attempt ${attempt}: Received ${response.status}:`, errorText);

      if (response.status >= 400 && response.status < 500) {
        return {
          success: false,
          message: `Engine error ${response.status}: ${errorText}`
        };
      }
    } catch (error) {
      console.error(`Attempt ${attempt}: Fetch error`, error);
    }

    if (attempt < maxRetries) {
      const delay = 500 * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const error = 'Failed to send payload to engine after all retries';
  console.error(error);
  return { success: false, message: error };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // ✅ ADD TOKEN FALLBACK
    const manualToken = env.MANUAL_TRIGGER_TOKEN || 'test123';
    const receivedToken = request.headers.get('X-Manual-Trigger');

    // Manual trigger path
    if (url.pathname === '/admin/run-job' && receivedToken === manualToken) {
      console.log(JSON.stringify({
        event: 'manual_trigger_authorized',
        tokenSource: env.MANUAL_TRIGGER_TOKEN ? 'environment' : 'default',
        timestamp: new Date().toISOString()
      }));

      const result = await runYoutubePull(env);

      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.message,
          timestamp: new Date().toISOString(),
          note: env.MANUAL_TRIGGER_TOKEN ? 'token from env' : 'using default token'
        }),
        {
          status: result.success ? 200 : 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          engine_url_set: !!env.ENGINE_BASE_URL,
          has_internal_token: !!env.INTERNAL_TOKEN,
          has_manual_token: !!env.MANUAL_TRIGGER_TOKEN,
          manual_token_source: env.MANUAL_TRIGGER_TOKEN ? 'environment' : 'default (test123)',
          timestamp: new Date().toISOString()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Default response
    return new Response(
      JSON.stringify({
        service: 'UG Board YouTube Puller Worker',
        endpoints: [
          { method: 'GET', path: '/health', description: 'Health check' },
          {
            method: 'POST',
            path: '/admin/run-job',
            description: 'Manual trigger',
            required_header: 'X-Manual-Trigger',
            note: env.MANUAL_TRIGGER_TOKEN
              ? 'Token configured in environment'
              : 'Using default token: test123'
          }
        ],
        cron_schedule: 'Every 30 minutes',
        timestamp: new Date().toISOString()
      }, null, 2),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(JSON.stringify({
      event: 'cron_triggered',
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      timestamp: new Date().toISOString()
    }));

    const result = await runYoutubePull(env);

    console.log(JSON.stringify({
      event: result.success ? 'cron_success' : 'cron_failure',
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    }));
  }
};

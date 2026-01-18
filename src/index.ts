export interface Env {
  ENGINE_BASE_URL: string;
  INTERNAL_TOKEN: string;
  INJECTION_TOKEN?: string;
  ADMIN_TOKEN?: string;
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ✅ Sample data for different endpoints
function getSampleDataForEndpoint(endpoint: string) {
  switch (endpoint) {
    case '/ingest/youtube':
      return [
        {
          id: `yt_${Date.now()}_001`,
          source: "youtube",
          external_id: "dQw4w9WgXcQ",
          title: "YouTube Video - Cron Job",
          artist: "Auto Artist",
          youtube_views: Math.floor(Math.random() * 10000),
          region: ["Eastern", "Northern", "Western"][Math.floor(Math.random() * 3)],
          published_at: new Date().toISOString(),
          score: 0
        }
      ];
    
    case '/ingest/radio':
      return [
        {
          id: `radio_${Date.now()}_001`,
          source: "radio",
          station: "Capital FM",
          title: "Radio Hit - Cron Job",
          artist: "Radio Artist",
          radio_plays: Math.floor(Math.random() * 100),
          region: "Eastern",
          published_at: new Date().toISOString(),
          score: 0
        }
      ];
    
    case '/admin/add-test-data':
      return [
        {
          id: `admin_${Date.now()}_001`,
          source: "manual",
          title: "Admin Test Data",
          artist: "Test Artist",
          region: "Eastern",
          published_at: new Date().toISOString()
        }
      ];
    
    default:
      return [{ id: `default_${Date.now()}`, source: "cron", timestamp: new Date().toISOString() }];
  }
}

// ✅ UNIVERSAL REQUEST FUNCTION - Tries multiple auth methods
async function sendToEngine(
  url: string, 
  endpoint: string,
  env: Env
): Promise<{ success: boolean; message: string; status?: number; methodUsed?: string }> {
  
  const payload = { 
    items: getSampleDataForEndpoint(endpoint),
    source: "worker_cron",
    endpoint: endpoint,
    timestamp: new Date().toISOString()
  };

  const maxRetries = 3;
  
  // ✅ LIST OF AUTH METHODS TO TRY (in order)
  const authMethods = [
    {
      name: 'X-Internal-Token',
      header: 'X-Internal-Token',
      value: env.INTERNAL_TOKEN || '1994199620002019866'
    },
    {
      name: 'Authorization-Injection',
      header: 'Authorization',
      value: `Bearer ${env.INJECTION_TOKEN || 'inject-ug-board-2025'}`
    },
    {
      name: 'Authorization-Admin', 
      header: 'Authorization',
      value: `Bearer ${env.ADMIN_TOKEN || 'admin-ug-board-2025'}`
    }
  ];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const requestId = crypto.randomUUID();
    const attemptStart = Date.now();

    // ✅ Try each authentication method
    for (const authMethod of authMethods) {
      try {
        console.log(JSON.stringify({
          event: 'engine_request_attempt',
          requestId,
          attempt,
          auth_method: authMethod.name,
          url,
          endpoint,
          timestamp: new Date().toISOString()
        }));

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            [authMethod.header]: authMethod.value,
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'User-Agent': 'UG-Board-Universal-Worker/1.0',
            'X-Endpoint': endpoint
          },
          body: JSON.stringify(payload)
        });

        const duration = Date.now() - attemptStart;
        const responseText = await response.text();

        console.log(JSON.stringify({
          event: 'engine_request_result',
          requestId,
          attempt,
          auth_method: authMethod.name,
          status: response.status,
          ok: response.ok,
          durationMs: duration,
          timestamp: new Date().toISOString()
        }));

        if (response.ok) {
          return {
            success: true,
            message: `Success with ${authMethod.name}! Status: ${response.status}`,
            status: response.status,
            methodUsed: authMethod.name
          };
        }

        // If 401, try next auth method
        if (response.status === 401) {
          console.log(JSON.stringify({
            event: 'auth_failed_try_next',
            requestId,
            auth_method: authMethod.name,
            status: 401
          }));
          continue; // Try next auth method
        }

        // Other errors return immediately
        return {
          success: false,
          message: `Error ${response.status} with ${authMethod.name}: ${responseText}`,
          status: response.status,
          methodUsed: authMethod.name
        };

      } catch (error) {
        const duration = Date.now() - attemptStart;
        console.error(JSON.stringify({
          event: 'request_error',
          requestId,
          attempt,
          auth_method: authMethod.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          durationMs: duration
        }));
        continue; // Try next auth method
      }
    }

    // Wait before next retry attempt
    if (attempt < maxRetries) {
      const delay = 1000 * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    message: 'All authentication methods and retries failed'
  };
}

// ✅ TEST ALL ENDPOINTS FUNCTION
async function testAllEndpoints(env: Env) {
  const engineBase = env.ENGINE_BASE_URL.replace(/\/+$/, '');
  const endpoints = [
    '/ingest/youtube',
    '/ingest/radio',
    '/admin/add-test-data',
    '/health'  // GET request
  ];

  const results = [];

  for (const endpoint of endpoints) {
    const url = `${engineBase}${endpoint}`;
    
    if (!validateUrl(url)) {
      results.push({
        endpoint,
        success: false,
        message: `Invalid URL: ${url}`
      });
      continue;
    }

    if (endpoint === '/health') {
      // Special handling for GET /health
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'UG-Board-Health-Check/1.0'
          }
        });
        
        results.push({
          endpoint,
          success: response.ok,
          status: response.status,
          message: `Health check ${response.ok ? 'passed' : 'failed'}`
        });
      } catch (error) {
        results.push({
          endpoint,
          success: false,
          message: `Health check error: ${error instanceof Error ? error.message : 'Unknown'}`
        });
      }
    } else {
      // POST requests to other endpoints
      const result = await sendToEngine(url, endpoint, env);
      results.push({
        endpoint,
        success: result.success,
        status: result.status,
        methodUsed: result.methodUsed,
        message: result.message
      });
    }
  }

  return results;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    
    // ✅ HEALTH ENDPOINT
    if (url.pathname === '/health') {
      const endpointsTest = await testAllEndpoints(env);
      const allSuccessful = endpointsTest.every(r => r.success);
      
      return new Response(
        JSON.stringify({
          service: 'UG Board Universal Worker',
          version: '4.0-universal',
          status: allSuccessful ? 'healthy' : 'degraded',
          engine_url: env.ENGINE_BASE_URL,
          endpoints_tested: endpointsTest,
          tokens_configured: {
            has_internal_token: !!env.INTERNAL_TOKEN,
            has_injection_token: !!env.INJECTION_TOKEN,
            has_admin_token: !!env.ADMIN_TOKEN
          },
          timestamp: new Date().toISOString(),
          requestId
        }, null, 2),
        {
          status: allSuccessful ? 200 : 207, // 207 = Multi-Status
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId
          }
        }
      );
    }
    
    // ✅ TEST ALL ENDPOINTS
    if (url.pathname === '/test-all') {
      const results = await testAllEndpoints(env);
      
      return new Response(
        JSON.stringify({
          service: 'UG Board Endpoint Tester',
          engine_url: env.ENGINE_BASE_URL,
          results,
          summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          },
          timestamp: new Date().toISOString(),
          requestId
        }, null, 2),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId
          }
        }
      );
    }
    
    // ✅ MANUAL TRIGGER FOR YOUTUBE
    if (url.pathname === '/trigger/youtube') {
      const engineBase = env.ENGINE_BASE_URL.replace(/\/+$/, '');
      const result = await sendToEngine(`${engineBase}/ingest/youtube`, '/ingest/youtube', env);
      
      return new Response(
        JSON.stringify({
          service: 'YouTube Manual Trigger',
          success: result.success,
          message: result.message,
          method_used: result.methodUsed,
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
    
    // ✅ DEFAULT RESPONSE
    return new Response(
      JSON.stringify({
        service: 'UG Board Universal Worker',
        version: '4.0-universal',
        description: 'Automated ingestion with multiple authentication support',
        features: [
          'Tries multiple auth methods automatically',
          'Tests all endpoints via /test-all',
          'Health check with endpoint validation',
          'Manual triggers for testing'
        ],
        endpoints: [
          { method: 'GET', path: '/health', description: 'Comprehensive health check' },
          { method: 'GET', path: '/test-all', description: 'Test all engine endpoints' },
          { method: 'GET', path: '/trigger/youtube', description: 'Manual YouTube trigger' }
        ],
        auth_methods_supported: [
          'X-Internal-Token: 1994199620002019866',
          'Authorization: Bearer inject-ug-board-2025',
          'Authorization: Bearer admin-ug-board-2025'
        ],
        cron_schedule: 'Every 30 minutes',
        engine_url: env.ENGINE_BASE_URL,
        timestamp: new Date().toISOString(),
        requestId
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

    const engineBase = env.ENGINE_BASE_URL.replace(/\/+$/, '');
    const result = await sendToEngine(`${engineBase}/ingest/youtube`, '/ingest/youtube', env);
    
    const duration = Date.now() - startTime;

    console.log(JSON.stringify({
      event: result.success ? 'cron_success' : 'cron_failure',
      cronId,
      success: result.success,
      message: result.message,
      method_used: result.methodUsed,
      durationMs: duration,
      timestamp: new Date().toISOString()
    }));
  }
};

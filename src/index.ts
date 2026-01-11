// Your complete worker code - copy ALL of this

interface Env {
  // Environment variables
  ENGINE_BASE_URL: string;
  INTERNAL_TOKEN: string;
  MANUAL_TRIGGER_TOKEN: string;
  MAX_RETRIES: string;
  RETRY_DELAY_MS: string;
}

// Main function that runs on every request
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log("🟡 Worker started at:", new Date().toISOString());
    
    // 1. GET YOUR SETTINGS
    const engineUrl = env.ENGINE_BASE_URL;
    const token = env.INTERNAL_TOKEN;
    const manualToken = env.MANUAL_TRIGGER_TOKEN;
    
    console.log("🔧 Settings check:");
    console.log("- Engine URL:", engineUrl ? "✅ Set" : "❌ MISSING");
    console.log("- Token:", token ? "✅ Set" : "❌ MISSING");
    
    // 2. CHECK IF SETTINGS ARE OK
    if (!engineUrl) {
      return errorResponse("ENGINE_BASE_URL is not set in settings");
    }
    if (!token) {
      return errorResponse("INTERNAL_TOKEN is not set in settings");
    }
    
    // 3. CHECK IF MANUAL TRIGGER
    const isManual = request.headers.get("X-Manual-Trigger") === manualToken;
    const triggerType = isManual ? "manual" : "cron";
    
    console.log("🎯 Trigger type:", triggerType);
    
    // 4. CALL YOUR ENGINE
    try {
      const result = await callEngine(engineUrl, token);
      console.log("✅ Success! Engine response:", result);
      
      return successResponse({
        message: "Ingestion worked!",
        trigger: triggerType,
        time: new Date().toISOString(),
        engineUrl: engineUrl
      });
      
    } catch (error) {
      console.log("❌ Error:", error);
      return errorResponse("Failed to call engine: " + error.message);
    }
  },

  // This runs automatically every 30 minutes
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log("⏰ Cron job running at:", new Date().toISOString());
    
    // Create a fake request to trigger the main function
    const request = new Request("https://cron.trigger", {
      headers: { "X-Cron-Trigger": "true" }
    });
    
    // Call ourselves
    await this.fetch(request, env);
  }
} satisfies ExportedHandler<Env>;

// Helper function to call your engine
async function callEngine(engineUrl: string, token: string): Promise<any> {
  const url = `${engineUrl}/ingest/youtube`;
  console.log("📤 Calling:", url);
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "User-Agent": "Cloudflare-Worker/1.0"
    },
    body: JSON.stringify({ items: [] })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Engine error ${response.status}: ${text}`);
  }
  
  return await response.json();
}

// Helper for success responses
function successResponse(data: any): Response {
  return new Response(JSON.stringify({
    success: true,
    ...data
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// Helper for error responses
function errorResponse(message: string): Response {
  return new Response(JSON.stringify({
    success: false,
    error: message,
    time: new Date().toISOString()
  }), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// In your src/index.ts, update the scheduled function:
async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  const startTime = Date.now();
  console.log("⏰ Cron job triggered at:", new Date().toISOString());
  
  try {
    // Log what we're about to do
    console.log("📤 Calling engine at:", env.ENGINE_BASE_URL);
    console.log("🔑 Token present:", env.INTERNAL_TOKEN ? "Yes" : "No");
    
    // Run the pull
    const result = await runYoutubePull(env);
    
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`✅ Cron job succeeded in ${duration}ms:`, result.message);
    } else {
      console.error(`❌ Cron job failed in ${duration}ms:`, result.message);
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`💥 Cron job crashed in ${duration}ms:`, error.message, error.stack);
  }
}

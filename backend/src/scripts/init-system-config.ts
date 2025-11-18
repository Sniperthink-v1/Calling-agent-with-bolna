import { DatabaseService } from '../services/databaseService';

/**
 * Initialize system configuration with default values
 * This script inserts default configuration values into the system_config table
 * if they don't already exist.
 */
async function initializeSystemConfig() {
  console.log('🔧 Initializing system configuration...');
  
  const client = await DatabaseService.getClient();
  
  try {
    await client.query('BEGIN');

    // Default configuration values
    const defaultConfig = [
      // Legacy configuration values
      { key: 'credits_per_minute', value: '1', description: 'Credits consumed per minute of call time' },
      { key: 'max_contacts_per_upload', value: '1000', description: 'Maximum number of contacts per bulk upload' },
      { key: 'new_user_bonus_credits', value: '15', description: 'Bonus credits given to new users' },
      { key: 'minimum_credit_purchase', value: '50', description: 'Minimum credit purchase amount' },
      { key: 'session_duration_hours', value: '24', description: 'User session duration in hours' },
      { key: 'max_login_attempts', value: '5', description: 'Maximum login attempts before lockout' },
      { key: 'lockout_duration_minutes', value: '30', description: 'Account lockout duration in minutes' },
      { key: 'password_min_length', value: '6', description: 'Minimum password length requirement' },
      { key: 'require_email_verification', value: 'true', description: 'Require email verification for new users' },
      { key: 'password_reset_token_expiry_hours', value: '1', description: 'Password reset token expiry in hours' },
      { key: 'kpi_refresh_interval_minutes', value: '15', description: 'KPI dashboard refresh interval in minutes' },
      
      // New system configuration values
      { key: 'stripe_webhook_secret', value: '', description: 'Stripe webhook endpoint secret' },
      { key: 'stripe_secret_key', value: '', description: 'Stripe secret key for payment processing' },
      { key: 'stripe_public_key', value: '', description: 'Stripe public key for client-side integration' },
      { key: 'monthly_call_limit', value: '1000', description: 'Monthly call limit per user' },
      { key: 'jwt_secret', value: 'default-jwt-secret-change-in-production', description: 'JWT token signing secret' },
      { key: 'jwt_expiration', value: '7d', description: 'JWT token expiration time' },
      { key: 'session_timeout', value: '3600', description: 'Session timeout in seconds' },
      { key: 'max_concurrent_calls', value: '50', description: 'Maximum concurrent calls allowed' },
      { key: 'default_voice_settings', value: 'default', description: 'Default voice settings for new agents' },
      { key: 'call_recording_enabled', value: 'false', description: 'Enable call recording by default' },
      { key: 'system_timezone', value: 'UTC', description: 'System default timezone' }
    ];

    let insertCount = 0;
    let updateCount = 0;

    for (const config of defaultConfig) {
      // Check if the configuration already exists
      const existingResult = await client.query(
        'SELECT config_key FROM system_config WHERE config_key = $1',
        [config.key]
      );

      if (existingResult.rows.length === 0) {
        // Insert new configuration
        await client.query(
          `INSERT INTO system_config (config_key, config_value, description, created_at, updated_at) 
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [config.key, config.value, config.description]
        );
        insertCount++;
        console.log(`✅ Inserted: ${config.key} = ${config.value}`);
      } else {
        // Update description if needed
        await client.query(
          `UPDATE system_config 
           SET description = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE config_key = $2 AND (description IS NULL OR description = '')`,
          [config.description, config.key]
        );
        updateCount++;
        console.log(`ℹ️  Exists: ${config.key}`);
      }
    }

    await client.query('COMMIT');
    
    console.log(`✅ System configuration initialized successfully!`);
    console.log(`📊 Summary: ${insertCount} inserted, ${updateCount} updated`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to initialize system configuration:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  initializeSystemConfig()
    .then(() => {
      console.log('🎉 System configuration initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 System configuration initialization failed:', error);
      process.exit(1);
    });
}

export { initializeSystemConfig };
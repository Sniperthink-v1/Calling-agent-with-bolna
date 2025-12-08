import { DatabaseService } from './databaseService';

interface SystemConfig {
  // Legacy configuration values
  credits_per_minute: number;
  billing_pulse_seconds: number; // Pulse-based billing: 60 = per minute, 30 = per 30s, 20 = per 20s
  max_contacts_per_upload: number;
  new_user_bonus_credits: number;
  minimum_credit_purchase: number;
  session_duration_hours: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  password_min_length: number;
  require_email_verification: boolean;
  password_reset_token_expiry_hours: number;
  kpi_refresh_interval_minutes: number;
  
  // New system configuration values
  stripe_webhook_secret: string;
  stripe_secret_key: string;
  stripe_public_key: string;
  monthly_call_limit: number;
  jwt_secret: string;
  jwt_expiration: string;
  session_timeout: number;
  max_concurrent_calls: number;
  default_voice_settings: string;
  call_recording_enabled: boolean;
  system_timezone: string;
}

class ConfigService {
  private static instance: ConfigService;
  private config: SystemConfig | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Initialize configuration from database at server startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔧 Initializing system configuration...');
      await this.loadConfigFromDatabase();
      this.isInitialized = true;
      console.log('✅ System configuration loaded successfully:', this.config);
    } catch (error) {
      console.error('❌ Failed to initialize system configuration:', error);
      // Use fallback defaults if database fails
      this.setFallbackConfig();
      this.isInitialized = true;
      console.log('⚠️ Using fallback configuration values');
    }
  }

  /**
   * Load configuration from database
   */
  private async loadConfigFromDatabase(): Promise<void> {
    const client = await DatabaseService.getClient();
    
    try {
      const query = `
        SELECT config_key, config_value 
        FROM system_config 
        WHERE config_key IN (
          'credits_per_minute',
          'billing_pulse_seconds',
          'max_contacts_per_upload',
          'new_user_bonus_credits',
          'minimum_credit_purchase',
          'session_duration_hours',
          'max_login_attempts',
          'lockout_duration_minutes',
          'password_min_length',
          'require_email_verification',
          'password_reset_token_expiry_hours',
          'kpi_refresh_interval_minutes',
          'stripe_webhook_secret',
          'stripe_secret_key',
          'stripe_public_key',
          'monthly_call_limit',
          'jwt_secret',
          'jwt_expiration',
          'session_timeout',
          'max_concurrent_calls',
          'default_voice_settings',
          'call_recording_enabled',
          'system_timezone'
        )
      `;      const result = await client.query(query);
      const configMap = new Map(result.rows.map(row => [row.config_key, row.config_value]));

      this.config = {
        // Legacy configuration values
        credits_per_minute: parseInt(configMap.get('credits_per_minute') || '1'),
        billing_pulse_seconds: parseInt(configMap.get('billing_pulse_seconds') || '60'), // Default: 60s (per-minute billing)
        max_contacts_per_upload: parseInt(configMap.get('max_contacts_per_upload') || '1000'),
        new_user_bonus_credits: parseInt(configMap.get('new_user_bonus_credits') || '15'),
        minimum_credit_purchase: parseInt(configMap.get('minimum_credit_purchase') || '50'),
        session_duration_hours: parseInt(configMap.get('session_duration_hours') || '24'),
        max_login_attempts: parseInt(configMap.get('max_login_attempts') || '5'),
        lockout_duration_minutes: parseInt(configMap.get('lockout_duration_minutes') || '30'),
        password_min_length: parseInt(configMap.get('password_min_length') || '6'),
        require_email_verification: configMap.get('require_email_verification') === 'true',
        password_reset_token_expiry_hours: parseInt(configMap.get('password_reset_token_expiry_hours') || '1'),
        kpi_refresh_interval_minutes: parseInt(configMap.get('kpi_refresh_interval_minutes') || '15'),
        
        // New system configuration values
        stripe_webhook_secret: configMap.get('stripe_webhook_secret') || '',
        stripe_secret_key: configMap.get('stripe_secret_key') || '',
        stripe_public_key: configMap.get('stripe_public_key') || '',
        monthly_call_limit: parseInt(configMap.get('monthly_call_limit') || '1000'),
        jwt_secret: configMap.get('jwt_secret') || 'default-jwt-secret-key',
        jwt_expiration: configMap.get('jwt_expiration') || '7d',
        session_timeout: parseInt(configMap.get('session_timeout') || '3600'),
        max_concurrent_calls: parseInt(configMap.get('max_concurrent_calls') || '50'),
        default_voice_settings: configMap.get('default_voice_settings') || 'default',
        call_recording_enabled: configMap.get('call_recording_enabled') === 'true',
        system_timezone: configMap.get('system_timezone') || 'UTC'
      };

    } finally {
      client.release();
    }
  }

  /**
   * Set fallback configuration when database is unavailable
   */
  private setFallbackConfig(): void {
    this.config = {
      // Legacy configuration values
      credits_per_minute: 1,
      billing_pulse_seconds: 60, // Default: 60s (per-minute billing)
      max_contacts_per_upload: 1000,
      new_user_bonus_credits: 15,
      minimum_credit_purchase: 50,
      session_duration_hours: 24,
      max_login_attempts: 5,
      lockout_duration_minutes: 30,
      password_min_length: 6,
      require_email_verification: true,
      password_reset_token_expiry_hours: 1,
      kpi_refresh_interval_minutes: 15,
      
      // New system configuration values
      stripe_webhook_secret: '',
      stripe_secret_key: '',
      stripe_public_key: '',
      monthly_call_limit: 1000,
      jwt_secret: 'default-jwt-secret-key',
      jwt_expiration: '7d',
      session_timeout: 3600,
      max_concurrent_calls: 50,
      default_voice_settings: 'default',
      call_recording_enabled: false,
      system_timezone: 'UTC'
    };
  }

  /**
   * Reload configuration from database (called when admin updates config)
   */
  async reloadConfig(): Promise<void> {
    console.log('🔄 Reloading system configuration from database...');
    await this.loadConfigFromDatabase();
    console.log('✅ System configuration reloaded:', this.config);
  }

  /**
   * Get cached configuration value
   */
  getConfig(): SystemConfig {
    if (!this.isInitialized || !this.config) {
      throw new Error('Configuration service not initialized. Call initialize() first.');
    }
    return { ...this.config }; // Return a copy to prevent mutations
  }

  /**
   * Get specific configuration value
   */
  get<K extends keyof SystemConfig>(key: K): SystemConfig[K] {
    const config = this.getConfig();
    return config[key];
  }

  /**
   * Update configuration in database and reload cache
   */
  async updateConfig(updates: Partial<Record<keyof SystemConfig, string | number | boolean>>): Promise<void> {
    const client = await DatabaseService.getClient();
    
    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(updates)) {
        const stringValue = typeof value === 'boolean' ? value.toString() : String(value);
        
        await client.query(
          `UPDATE system_config 
           SET config_value = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE config_key = $2`,
          [stringValue, key]
        );
      }

      await client.query('COMMIT');
      
      // Reload configuration after successful update
      await this.reloadConfig();
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.config !== null;
  }
}

export const configService = ConfigService.getInstance();
export { SystemConfig };
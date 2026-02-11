import Agent from '../models/Agent';
import { bolnaService, BolnaAgentConfig, BolnaAgent, CreateBolnaAgentRequest } from './bolnaService';
import { logger } from '../utils/logger';
import { AgentInterface } from '../models/Agent';
import database from '../config/database';
import { queryCache, QueryCache } from './queryCache';
import { agentCacheService } from './agentCache';

export interface AgentCreateData {
  name: string;
  type?: 'ChatAgent' | 'CallAgent';
  voice_id?: string;
  description?: string;
  system_prompt?: string;
  first_message?: string;
  language?: string;
  max_duration_seconds?: number;
  response_engine?: {
    type: string;
    config?: any;
  };
  llm?: {
    model: string;
    temperature?: number;
    max_tokens?: number;
  };
  tts?: {
    voice_id: string;
    model?: string;
    voice_settings?: {
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
    };
  };
  data_collection?: {
    default?: {
      type?: string;
      description?: string;
    };
  };
}

export interface AgentUpdateData extends Partial<AgentCreateData> {
  is_active?: boolean;
  agent_type?: 'chat' | 'call';
}

export interface AgentWithConfig extends AgentInterface {
  config?: BolnaAgent;
}

// Frontend-compatible agent interface
export interface FrontendAgent {
  id: string; // Changed from number to string to support UUID
  name: string;
  type: 'ChatAgent' | 'CallAgent';
  language: string;
  description: string;
  status: 'active' | 'draft';
  model: string;
  conversations: number;
  creditsRemaining: number;
  created: string;
  doc?: any;
  // Performance metrics
  successRate?: number;
  avgDuration?: string;
  // New: include Bolna agent id for direct calls
  bolnaAgentId?: string;
  // Data collection field from Bolna agent config
  data_collection?: {
    default?: {
      type?: string;
      description?: string;
    };
  };
}

class AgentService {
  /**
   * Create a new agent for a user
   */
  async createAgent(userId: string, agentData: AgentCreateData): Promise<AgentWithConfig> {
    try {
      // Debug logging to check what agentService receives
      if (agentData.data_collection?.default?.description) {
        const serviceReceivedLength = agentData.data_collection.default.description.length;
        logger.info(`[AgentService] Received data_collection description with ${serviceReceivedLength} characters`);
        logger.info(`[AgentService] First 200 chars: ${agentData.data_collection.default.description.substring(0, 200)}...`);
        logger.info(`[AgentService] Last 200 chars: ...${agentData.data_collection.default.description.substring(Math.max(0, serviceReceivedLength - 200))}`);
      }

      // Validate agent data
      this.validateAgentData(agentData);

      // Set up webhook URL for Bolna.ai
      const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhooks/bolna`;

      // Get voice configuration from the provided voice_id
      // The voice_id from frontend should be the actual Bolna voice ID
      const voiceId = agentData.tts?.voice_id || agentData.voice_id;
      
      // Fetch available voices to get the correct provider and settings
      let voiceProvider = 'polly';
      let voiceName = 'Matthew'; // Default fallback
      let voiceModel = 'generative';
      let synthesizerConfig: any = {};
      
      if (voiceId) {
        try {
          const voices = await bolnaService.getVoices();
          const selectedVoice = voices.find(v => v.id === voiceId || v.voice_id === voiceId);
          
          if (selectedVoice) {
            voiceProvider = selectedVoice.provider || 'polly';
            voiceName = selectedVoice.voice_id || selectedVoice.name || 'Matthew';
            voiceModel = selectedVoice.model || 'generative';
            logger.info(`Using voice: ${voiceName} from provider: ${voiceProvider} (model: ${voiceModel})`);
            
            // Configure provider_config based on the voice provider
            if (voiceProvider === 'elevenlabs') {
              // ElevenLabs requires voice_id field
              synthesizerConfig = {
                voice_id: voiceName,
                model: voiceModel || 'eleven_turbo_v2_5'
              };
            } else if (voiceProvider === 'polly') {
              // Polly uses voice, engine, sampling_rate
              synthesizerConfig = {
                voice: voiceName,
                engine: voiceModel === 'generative' ? 'generative' : 'neural',
                sampling_rate: '8000',
                language: agentData.language || 'en-US'
              };
            } else if (voiceProvider === 'azuretts' || voiceProvider === 'azure') {
              // Azure TTS configuration
              synthesizerConfig = {
                voice: voiceName,
                language: agentData.language || 'en-US',
                sampling_rate: '8000'
              };
            } else {
              // Generic configuration for other providers (sarvam, rime, inworld, etc.)
              synthesizerConfig = {
                voice_id: voiceName,
                voice: voiceName,
                model: voiceModel,
                language: agentData.language || 'en-US'
              };
            }
          } else {
            logger.warn(`Voice ${voiceId} not found in Bolna voices, using Polly defaults`);
            synthesizerConfig = {
              voice: 'Matthew',
              engine: 'generative',
              sampling_rate: '8000',
              language: agentData.language || 'en-US'
            };
          }
        } catch (error) {
          logger.warn('Failed to fetch voices for validation, using Polly defaults:', error);
          synthesizerConfig = {
            voice: 'Matthew',
            engine: 'generative',
            sampling_rate: '8000',
            language: agentData.language || 'en-US'
          };
        }
      } else {
        // No voice specified, use Polly default
        synthesizerConfig = {
          voice: 'Matthew',
          engine: 'generative',
          sampling_rate: '8000',
          language: agentData.language || 'en-US'
        };
      }

      // Convert to Bolna.ai agent format
      const createRequest: CreateBolnaAgentRequest = {
        agent_config: {
          agent_name: agentData.name,
          agent_welcome_message: agentData.first_message || 'Hello! How can I help you today?',
          webhook_url: webhookUrl,
          tasks: [{
            task_type: 'conversation',
            tools_config: {
              llm_agent: {
                agent_type: 'simple_llm_agent',
                agent_flow_type: 'streaming',
                llm_config: {
                  agent_flow_type: 'streaming',
                  provider: 'openai',
                  family: 'openai',
                  model: agentData.llm?.model || 'gpt-3.5-turbo',
                  max_tokens: agentData.llm?.max_tokens || 1000,
                  temperature: agentData.llm?.temperature || 0.7,
                  request_json: false
                }
              },
              synthesizer: {
                provider: voiceProvider as any,
                provider_config: synthesizerConfig,
                stream: true,
                buffer_size: 150,
                audio_format: 'wav'
              },
              transcriber: {
                provider: 'deepgram',
                model: 'nova-2',
                language: 'en',
                stream: true,
                sampling_rate: 8000,
                encoding: 'linear16',
                endpointing: 500
              },
              input: {
                provider: 'twilio',
                format: 'wav'
              },
              output: {
                provider: 'twilio',
                format: 'wav'
              }
            },
            toolchain: {
              execution: 'parallel',
              pipelines: [['transcriber', 'llm', 'synthesizer']]
            },
            task_config: {}
          }]
        },
        agent_prompts: {
          task_1: {
            system_prompt: agentData.system_prompt || "You are a helpful AI assistant."
          }
        }
      };

      // Create agent in Bolna.ai
      const bolnaAgent = await bolnaService.createAgent(createRequest);

      // Store agent association in our database
      const agent = await Agent.create({
        user_id: userId,
        bolna_agent_id: bolnaAgent.agent_id,
        name: agentData.name,
        agent_type: agentData.type === 'ChatAgent' ? 'chat' : 'call',
        description: agentData.description || '',
        is_active: true,
      });

      logger.info(`Created agent ${agent.id} for user ${userId} with Bolna.ai ID ${bolnaAgent.agent_id}`);

      // Invalidate user's agent caches after creation
      agentCacheService.clearUserAgentCaches(userId);

      return {
        ...agent,
        config: bolnaAgent,
      };
    } catch (error) {
      logger.error('Failed to create agent:', error);
      throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map legacy voice IDs to Amazon Polly voice names for Bolna.ai
   */
  private mapVoiceIdToPollyVoice(voiceId?: string): string {
    const voiceMapping: { [key: string]: string } = {
      'pNInz6obpgDQGcFmaJgB': 'Joanna', // Default female voice
      '21m00Tcm4TlvDq8ikWAM': 'Matthew', // Default male voice
      'ErXwobaYiN019PkySvjV': 'Amy',
      'MF3mGyEYCl7XYWbV9V6O': 'Brian',
      'TxGEqnHWrfWFTfGW9XjX': 'Emma',
      'VR6AewLTigWG4xSOukaG': 'Justin',
      'pqHfZKP75CvOlQylNhV4': 'Kendra',
      'yoZ06aMxZJJ28mfd3POQ': 'Kimberly',
      'cjVigY5qzO86Huf0OWal': 'Salli'
    };
    
    return voiceMapping[voiceId || ''] || 'Joanna'; // Default to Joanna
  }

  /**
   * Get agent by ID with configuration from Bolna.ai
   * Requirements: 3.4, 5.2, 5.6
   */
  async getAgent(userId: string, agentId: string): Promise<AgentWithConfig | null> {
    try {
      const agent = await Agent.findOne({ id: agentId, user_id: userId });

      if (!agent) {
        return null;
      }

      // Fetch configuration from Bolna.ai with graceful degradation
      let config: BolnaAgent | undefined;
      if (agent.bolna_agent_id) {
        try {
          config = await bolnaService.getAgent(agent.bolna_agent_id);
        } catch (error) {
          logger.warn(`Failed to fetch Bolna agent config for ${agent.bolna_agent_id}:`, error);
          config = undefined;
        }
      }
      
      return {
        ...agent,
        config: config || undefined,
      };
    } catch (error) {
      logger.error(`Failed to get agent ${agentId}:`, error);
      throw new Error(`Failed to get agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all agents for a user with their configurations using parallel Bolna.ai API calls
   * Requirements: 3.3, 5.2, 5.3, 5.4
   */
  async listAgents(userId: string): Promise<AgentWithConfig[]> {
    try {
      const agents = await Agent.findByUserId(userId);

      if (agents.length === 0) {
        return [];
      }

      // Extract Bolna agent IDs for parallel fetching (filter out undefined values)
      const bolnaAgentIds = agents.map(agent => agent.bolna_agent_id).filter((id): id is string => Boolean(id));
      
      logger.info(`Starting parallel Bolna.ai config fetch for ${agents.length} agents`, {
        userId,
        agentCount: agents.length,
        bolnaAgentCount: bolnaAgentIds.length
      });

      // Create a map of Bolna configs for quick lookup
      const configMap = new Map<string, BolnaAgent>();
      
      // Fetch configurations from Bolna.ai in parallel with error handling
      let successCount = 0;
      let errorCount = 0;
      const startTime = Date.now();
      
      if (bolnaAgentIds.length > 0) {
        const configPromises = bolnaAgentIds.map(async (agentId) => {
          try {
            const config = await bolnaService.getAgent(agentId);
            return { agentId, config, success: true };
          } catch (error) {
            logger.warn(`Failed to fetch Bolna agent config for ${agentId}:`, error);
            return { agentId, config: null, success: false };
          }
        });

        const results = await Promise.allSettled(configPromises);
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success && result.value.config) {
            configMap.set(result.value.agentId, result.value.config);
            successCount++;
          } else {
            errorCount++;
          }
        });
      }

      // Combine agents with their configurations
      const agentsWithConfig: AgentWithConfig[] = agents.map(agent => ({
        ...agent,
        config: agent.bolna_agent_id ? configMap.get(agent.bolna_agent_id) : undefined
      }));

      const totalTime = Date.now() - startTime;
      logger.info(`Completed parallel agent listing for user ${userId}`, {
        totalAgents: agents.length,
        configsLoaded: successCount,
        configsFailed: errorCount,
        successRate: `${Math.round((successCount / Math.max(bolnaAgentIds.length, 1)) * 100)}%`,
        totalTime: `${totalTime}ms`,
        avgTimePerAgent: bolnaAgentIds.length > 0 ? `${Math.round(totalTime / bolnaAgentIds.length)}ms` : '0ms',
        parallelMethod: 'Promise.allSettled'
      });

      return agentsWithConfig;
    } catch (error) {
      logger.error(`Failed to list agents for user ${userId}:`, error);
      throw new Error(`Failed to list agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an agent's configuration
   */
  async updateAgent(userId: string, agentId: string, agentData: AgentUpdateData): Promise<AgentWithConfig> {
    try {
      // Validate agent data
      this.validateAgentData(agentData);

      const agent = await Agent.findOne({ id: agentId, user_id: userId });

      if (!agent) {
        throw new Error('Agent not found');
      }

      if (!agent.bolna_agent_id) {
        throw new Error('Agent not linked to Bolna.ai - cannot update');
      }

      if (typeof agentData.name === 'string' && agentData.name.trim().length === 0) {
        throw new Error('Agent name cannot be empty');
      }

      const normalizedName = typeof agentData.name === 'string' ? agentData.name.trim() : undefined;
      const hasNameUpdate = !!normalizedName && normalizedName !== agent.name;
      const requiresFullBolnaUpdate = (
        agentData.first_message !== undefined ||
        agentData.system_prompt !== undefined ||
        agentData.language !== undefined ||
        agentData.llm !== undefined ||
        agentData.tts !== undefined ||
        agentData.response_engine !== undefined ||
        agentData.data_collection !== undefined ||
        agentData.type !== undefined ||
        agentData.agent_type !== undefined
      );

      let bolnaAgent: BolnaAgent | undefined;

      // Rename-only updates should use PATCH to avoid invalidating other Bolna config.
      if (hasNameUpdate && !requiresFullBolnaUpdate) {
        bolnaAgent = await bolnaService.patchAgentName(agent.bolna_agent_id, normalizedName);
      } else if (hasNameUpdate || requiresFullBolnaUpdate) {
        // Build Bolna.ai update request with full structure when non-name config updates are requested.
        const updateRequest = {
          agent_config: {
            agent_name: normalizedName || agent.name,
            agent_welcome_message: agentData.first_message || "Hello! How can I help you today?",
            webhook_url: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/bolna`,
            tasks: [{
              task_type: 'conversation' as const,
              tools_config: {
                llm_agent: {
                  agent_type: 'simple_llm_agent' as const,
                  agent_flow_type: 'streaming' as const,
                  llm_config: {
                    agent_flow_type: 'streaming' as const,
                    provider: 'openai' as const,
                    family: 'openai',
                    model: agentData.llm?.model || 'gpt-3.5-turbo',
                    max_tokens: agentData.llm?.max_tokens || 1000,
                    temperature: agentData.llm?.temperature || 0.7,
                    request_json: false
                  }
                },
                synthesizer: {
                  provider: 'polly' as const,
                  provider_config: {
                    voice: agentData.tts?.voice_id ? this.mapVoiceIdToPollyVoice(agentData.tts.voice_id) : 'Joanna',
                    engine: 'generative',
                    sampling_rate: '8000',
                    language: agentData.language || 'en-US'
                  },
                  stream: true,
                  buffer_size: 150,
                  audio_format: 'wav' as const
                },
                transcriber: {
                  provider: 'deepgram' as const,
                  model: 'nova-2',
                  language: 'en',
                  stream: true,
                  sampling_rate: 8000,
                  encoding: 'linear16',
                  endpointing: 500
                },
                input: {
                  provider: 'twilio' as const,
                  format: 'wav' as const
                },
                output: {
                  provider: 'twilio' as const,
                  format: 'wav' as const
                }
              },
              toolchain: {
                execution: 'parallel' as const,
                pipelines: [['transcriber', 'llm', 'synthesizer']]
              },
              task_config: {
                hangup_after: 300,
                ambient_sound: 'none',
                ambient_sound_volume: 0.1,
                interruption_backoff_period: 1.0,
                backchanneling: false,
                optimize_latency: true,
                incremental: false,
                normalize_audio: true
              }
            }]
          },
          agent_prompts: {
            task_1: {
              system_prompt: agentData.system_prompt || "You are a helpful AI assistant."
            }
          }
        };

        bolnaAgent = await bolnaService.updateAgent(agent.bolna_agent_id, updateRequest);
      }

      // Update local agent record if name, description, or status changed
      const localUpdates: any = {};
      if (hasNameUpdate) {
        localUpdates.name = normalizedName;
      }
      if (agentData.description !== undefined && agentData.description !== agent.description) {
        localUpdates.description = agentData.description;
      }
      if ('is_active' in agentData && agentData.is_active !== agent.is_active) {
        localUpdates.is_active = agentData.is_active;
      }

      if (Object.keys(localUpdates).length > 0) {
        const updatedAgent = await Agent.update(agentId, localUpdates);
        if (updatedAgent) {
          Object.assign(agent, localUpdates);
        }
      }

      logger.info(`Updated agent ${agentId} for user ${userId}`, {
        bolnaUpdated: !!bolnaAgent,
        localFieldsUpdated: Object.keys(localUpdates)
      });

      // Invalidate agent caches after update
      agentCacheService.invalidateAgentCache(userId, agentId);

      return {
        ...agent,
        config: bolnaAgent,
      };
    } catch (error) {
      logger.error(`Failed to update agent ${agentId}:`, error);
      throw new Error(`Failed to update agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(userId: string, agentId: string): Promise<void> {
    try {
      const agent = await Agent.findOne({ id: agentId, user_id: userId });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Delete from Bolna.ai if agent is linked
      if (agent.bolna_agent_id) {
        try {
          await bolnaService.deleteAgent(agent.bolna_agent_id);
        } catch (error) {
          logger.warn(`Failed to delete agent from Bolna.ai: ${error}. Proceeding with local deletion.`);
        }
      }

      // Delete from our database
      await Agent.delete(agentId);

      // Invalidate agent caches after deletion
      agentCacheService.clearUserAgentCaches(userId);

      logger.info(`Deleted agent ${agentId} for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to delete agent ${agentId}:`, error);
      throw new Error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available voices from Bolna.ai (Amazon Polly voices)
   */
  async getVoices(): Promise<any[]> {
    try {
      // Return static list of commonly used Amazon Polly voices
      // In the future, this could be enhanced to fetch from Bolna.ai API
      return [
        { voice_id: 'Joanna', name: 'Joanna', category: 'premium', description: 'Female US English' },
        { voice_id: 'Matthew', name: 'Matthew', category: 'premium', description: 'Male US English' },
        { voice_id: 'Amy', name: 'Amy', category: 'standard', description: 'Female British English' },
        { voice_id: 'Brian', name: 'Brian', category: 'standard', description: 'Male British English' },
        { voice_id: 'Emma', name: 'Emma', category: 'standard', description: 'Female British English' },
        { voice_id: 'Justin', name: 'Justin', category: 'standard', description: 'Male US English (child)' },
        { voice_id: 'Kendra', name: 'Kendra', category: 'standard', description: 'Female US English' },
        { voice_id: 'Kimberly', name: 'Kimberly', category: 'standard', description: 'Female US English' },
        { voice_id: 'Salli', name: 'Salli', category: 'standard', description: 'Female US English' }
      ];
    } catch (error) {
      logger.error('Failed to get voices:', error);
      throw new Error(`Failed to get voices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test Bolna.ai API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test connection by trying to get voices or agents
      await bolnaService.getVoices();
      return true;
    } catch (error) {
      logger.error('Failed to test Bolna.ai connection:', error);
      return false;
    }
  }

  /**
   * Transform backend agent data to frontend format
   */
  private async transformToFrontendFormat(agent: AgentWithConfig): Promise<FrontendAgent> {
    // Extract language from Bolna synthesizer config
    const synthesizer = agent.config?.agent_config?.tasks?.[0]?.tools_config?.synthesizer;
    const configLanguage = synthesizer?.provider_config?.language?.split('-')[0] || 'en';
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'pl': 'Polish',
      'tr': 'Turkish',
      'ru': 'Russian',
      'nl': 'Dutch',
      'cs': 'Czech',
      'ar': 'Arabic',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'hu': 'Hungarian',
      'ko': 'Korean'
    };

    // Extract description from database record (not from Bolna config)
    const description = agent.description || '';

    // Extract model from Bolna LLM config
    const llmConfig = agent.config?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config;
    const model = llmConfig?.model || 'gpt-4o-mini';

    // Get real performance data from database
    let conversations = 0;
    let successRate = 0;
    let avgDuration = '0m';
    let creditsRemaining = 0;

    try {
      // Get call statistics for this agent
      const callStatsQuery = `
        SELECT 
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
          COALESCE(AVG(duration_seconds), 0) / 60.0 as avg_duration,
          COALESCE(SUM(credits_used), 0) as total_credits_used
        FROM calls 
        WHERE agent_id = $1
      `;
      const callStatsResult = await database.query(callStatsQuery, [agent.id]);
      const callStats = callStatsResult.rows[0];

      conversations = parseInt(callStats.total_calls) || 0;
      const completedCalls = parseInt(callStats.completed_calls) || 0;
      successRate = conversations > 0 ? Math.round((completedCalls / conversations) * 100) : 0;
      const avgDurationMinutes = parseFloat(callStats.avg_duration) || 0;
      avgDuration = avgDurationMinutes > 0 ? avgDurationMinutes.toFixed(1) + 'm' : '0m';

      // For credits remaining, we'd need to get user's total credits and subtract used credits
      // For now, we'll use a placeholder calculation
      creditsRemaining = Math.max(1000 - (parseInt(callStats.total_credits_used) || 0), 0);
    } catch (error) {
      logger.error(`Failed to get performance data for agent ${agent.id}:`, error);
      // Fallback to default values (already set above)
    }

    // Data collection for Bolna is handled differently - use default 
    const dataCollection = undefined; // Bolna doesn't have platform_settings

    return {
      id: agent.id, // Keep UUID as string for frontend
      name: agent.name,
      type: agent.agent_type === 'call' ? 'CallAgent' : 'ChatAgent',
      language: languageMap[configLanguage] || 'English',
      description: description,
      status: agent.is_active ? 'active' : 'draft',
      model: model,
      conversations: conversations,
      creditsRemaining: creditsRemaining,
      created: new Date(agent.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
      doc: null,
      successRate: successRate,
      avgDuration: avgDuration,
      bolnaAgentId: (agent as any).bolna_agent_id,
      data_collection: dataCollection,
    };
  }

  /**
   * Batch transform agents to frontend format using single query for all performance data with caching
   * This replaces individual queries with a single batch query using JOINs and caches results
   */
  private async batchTransformToFrontendFormat(agents: AgentWithConfig[], userId: string): Promise<FrontendAgent[]> {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'pl': 'Polish',
      'tr': 'Turkish',
      'ru': 'Russian',
      'nl': 'Dutch',
      'cs': 'Czech',
      'ar': 'Arabic',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'hu': 'Hungarian',
      'ko': 'Korean'
    };

    try {
      // Get all agent IDs for batch query
      const agentIds = agents.map(agent => agent.id);
      
      if (agentIds.length === 0) {
        return [];
      }

      // Check cache first for batch performance data
      const cacheKey = QueryCache.generateAgentKey(userId, 'batch_performance', agentIds.sort().join(','));
      let performanceMap = queryCache.get<Map<string, any>>(cacheKey);
      
      if (!performanceMap) {
        // Single batch query to get performance data for all agents
        // Uses the idx_calls_agent_performance index for optimal performance
        const batchStatsQuery = `
          SELECT 
            agent_id,
            COUNT(*) as total_calls,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
            COALESCE(AVG(duration_seconds), 0) / 60.0 as avg_duration,
            COALESCE(SUM(credits_used), 0) as total_credits_used
          FROM calls 
          WHERE agent_id = ANY($1) AND user_id = $2
          GROUP BY agent_id
        `;
        
        const batchStatsResult = await database.query(batchStatsQuery, [agentIds, userId]);
        
        // Create a map of agent performance data for quick lookup
        performanceMap = new Map();
        batchStatsResult.rows.forEach((row: any) => {
          const conversations = parseInt(row.total_calls) || 0;
          const completedCalls = parseInt(row.completed_calls) || 0;
          const successRate = conversations > 0 ? Math.round((completedCalls / conversations) * 100) : 0;
          const avgDurationMinutes = parseFloat(row.avg_duration) || 0;
          const avgDuration = avgDurationMinutes > 0 ? avgDurationMinutes.toFixed(1) + 'm' : '0m';
          const creditsUsed = parseInt(row.total_credits_used) || 0;
          
          performanceMap!.set(row.agent_id, {
            conversations,
            successRate,
            avgDuration,
            creditsRemaining: Math.max(1000 - creditsUsed, 0) // Placeholder calculation
          });
        });

        // Cache the performance map for 5 minutes
        queryCache.set(cacheKey, performanceMap, 5 * 60 * 1000);
        logger.debug(`Cached batch agent performance for user: ${userId}`);
      } else {
        logger.debug(`Cache hit for batch agent performance: ${userId}`);
      }

      // Transform all agents using the performance map
      return agents.map(agent => {
        const synthesizer = agent.config?.agent_config?.tasks?.[0]?.tools_config?.synthesizer;
        const llmConfig = agent.config?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config;
        const configLanguage = synthesizer?.provider_config?.language?.split('-')[0] || 'en';
        const description = agent.description || '';
        const model = llmConfig?.model || 'gpt-4o-mini';
        
        // Get performance data from map or use defaults
        const performance = performanceMap.get(agent.id) || {
          conversations: 0,
          successRate: 0,
          avgDuration: '0m',
          creditsRemaining: 1000
        };

        return {
          id: agent.id, // Keep UUID as string for frontend
          name: agent.name,
          type: agent.agent_type === 'call' ? 'CallAgent' : 'ChatAgent',
          language: languageMap[configLanguage] || 'English',
          description: description,
          status: agent.is_active ? 'active' : 'draft',
          model: model,
          conversations: performance.conversations,
          creditsRemaining: performance.creditsRemaining,
          created: new Date(agent.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          }),
          doc: null,
          successRate: performance.successRate,
          avgDuration: performance.avgDuration,
          bolnaAgentId: (agent as any).bolna_agent_id,
        };
      });
    } catch (error) {
      logger.error(`Failed to batch transform agents for user ${userId}:`, error);
      // Fallback to individual transformation
      logger.warn('Falling back to individual agent transformation');
      return Promise.all(agents.map(agent => this.transformToFrontendFormat(agent)));
    }
  }

  /**
   * Create a simple agent with minimal configuration
   */
  async createSimpleAgent(userId: string, name: string, voiceId?: string): Promise<AgentWithConfig> {
    const agentData: AgentCreateData = {
      name,
      type: 'CallAgent',
      description: `AI calling agent: ${name}`,
      system_prompt: 'You are a helpful AI assistant. Be concise and friendly.',
      first_message: 'Hello! How can I help you today?',
      language: 'en',
      ...(voiceId && {
        tts: {
          voice_id: voiceId,
          model: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        }
      }),
      llm: {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 500
      }
    };

    return this.createAgent(userId, agentData);
  }

  /**
   * Get agents in frontend format (OPTIMIZED with batch queries and caching)
   * Requirements: 3.5, 6.1, 6.5
   */
  async listAgentsForFrontend(userId: string): Promise<FrontendAgent[]> {
    try {
      // Use agent cache service for optimized performance
      return await agentCacheService.getBatchAgentPerformance(userId);
    } catch (error) {
      logger.error(`Failed to list agents for frontend for user ${userId}:`, error);
      
      // Fallback to original implementation if cache fails
      try {
        logger.warn(`Falling back to non-cached agent list for user ${userId}`);
        const agents = await this.listAgents(userId);
        
        if (agents.length === 0) {
          return [];
        }

        // Use batch transformation for better performance
        return await this.batchTransformToFrontendFormat(agents, userId);
      } catch (fallbackError) {
        logger.error(`Fallback agent list also failed for user ${userId}:`, fallbackError);
        throw error; // Throw original error
      }
    }
  }

  /**
   * Get single agent in frontend format (with caching)
   * Requirements: 3.5, 6.1
   */
  async getAgentForFrontend(userId: string, agentId: string): Promise<FrontendAgent | null> {
    try {
      // Try to get from cache first
      const cachedAgent = await agentCacheService.getAgentPerformance(userId, agentId);
      if (cachedAgent) {
        // Transform cache entry to frontend format
        return {
          id: cachedAgent.agentId, // Keep UUID as string - don't convert to number
          name: cachedAgent.basicInfo.name,
          type: cachedAgent.basicInfo.type as 'ChatAgent' | 'CallAgent',
          language: 'English', // Default for cached entries until cache is updated
          description: cachedAgent.basicInfo.description,
          status: cachedAgent.basicInfo.status as 'active' | 'draft',
          model: 'gpt-4o-mini', // Default for cached entries until cache is updated
          conversations: cachedAgent.performance.conversations,
          creditsRemaining: Math.max(1000 - cachedAgent.performance.creditsUsed, 0),
          created: new Date(cachedAgent.basicInfo.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          }),
          doc: null,
          successRate: cachedAgent.performance.successRate,
          avgDuration: cachedAgent.performance.avgDuration,
          bolnaAgentId: cachedAgent.basicInfo.bolna_agent_id,
        };
      }

      // Fallback to original implementation
      const agent = await this.getAgent(userId, agentId);
      if (!agent) {
        return null;
      }
      return await this.transformToFrontendFormat(agent);
    } catch (error) {
      logger.error(`Failed to get agent for frontend: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * Extract language from Bolna config (helper method)
   */
  private extractLanguageFromConfig(config?: BolnaAgent): string {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'pl': 'Polish',
      'tr': 'Turkish',
      'ru': 'Russian',
      'nl': 'Dutch',
      'cs': 'Czech',
      'ar': 'Arabic',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'hu': 'Hungarian',
      'ko': 'Korean'
    };

    // Extract language from Bolna synthesizer config
    const synthesizer = config?.agent_config?.tasks?.[0]?.tools_config?.synthesizer;
    const configLanguage = synthesizer?.provider_config?.language?.split('-')[0] || 'en';
    return languageMap[configLanguage] || 'English';
  }

  /**
   * Extract model from Bolna config (helper method)
   */
  private extractModelFromConfig(config?: BolnaAgent): string {
    // Extract model from Bolna LLM config
    const llmConfig = config?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config;
    return llmConfig?.model || 'gpt-4o-mini';
  }

  /**
   * Get agent configuration in a structured format
   */
  async getAgentConfiguration(userId: string, agentId: string): Promise<any> {
    try {
      const agent = await this.getAgent(userId, agentId);
      if (!agent || !agent.config) {
        return null;
      }

      const config = agent.config;
      const synthesizer = config.agent_config?.tasks?.[0]?.tools_config?.synthesizer;
      const llmConfig = config.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config;
      const systemPrompt = config.agent_prompts?.task_1?.system_prompt;
      
      return {
        basic: {
          name: agent.name,
          type: agent.agent_type,
          language: synthesizer?.provider_config?.language || 'en-US',
          description: agent.description || ''
        },
        conversation: {
          first_message: config.agent_config?.agent_welcome_message || '',
          system_prompt: systemPrompt || ''
        },
        voice: {
          voice_id: synthesizer?.provider_config?.voice || '',
          model: synthesizer?.provider || 'polly',
          settings: {
            engine: synthesizer?.provider_config?.engine || 'generative',
            sampling_rate: synthesizer?.provider_config?.sampling_rate || '8000',
            language: synthesizer?.provider_config?.language || 'en-US'
          }
        },
        llm: {
          model: llmConfig?.model || 'gpt-4o-mini',
          temperature: llmConfig?.temperature || 0.7,
          max_tokens: llmConfig?.max_tokens || 500
        },
        metadata: {
          agent_id: config.agent_id,
          created_at: config.created_at,
          updated_at: config.updated_at
        }
      };
    } catch (error) {
      logger.error(`Failed to get agent configuration: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * Validate agent data before creation/update
   */
  private validateAgentData(agentData: AgentCreateData | AgentUpdateData): void {
    if ('name' in agentData && agentData.name && agentData.name.length > 100) {
      throw new Error('Agent name must be 100 characters or less');
    }

    if ('system_prompt' in agentData && agentData.system_prompt && agentData.system_prompt.length > 2000) {
      throw new Error('System prompt must be 2000 characters or less');
    }

    if ('first_message' in agentData && agentData.first_message && agentData.first_message.length > 500) {
      throw new Error('First message must be 500 characters or less');
    }

    if ('language' in agentData && agentData.language) {
      const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 'cs', 'ar', 'zh', 'ja', 'hu', 'ko'];
      if (!supportedLanguages.includes(agentData.language)) {
        throw new Error(`Unsupported language: ${agentData.language}`);
      }
    }

    if ('llm' in agentData && agentData.llm) {
      if (agentData.llm.temperature && (agentData.llm.temperature < 0 || agentData.llm.temperature > 2)) {
        throw new Error('LLM temperature must be between 0 and 2');
      }
      if (agentData.llm.max_tokens && (agentData.llm.max_tokens < 1 || agentData.llm.max_tokens > 4000)) {
        throw new Error('LLM max_tokens must be between 1 and 4000');
      }
    }
  }
}

export const agentService = new AgentService();

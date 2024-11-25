import { z } from 'zod';

const envSchema = z.object({
  VITE_ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key is required')
});

export interface AIConfig {
  apiKey: string;
  enabled: boolean;
}

class ConfigService {
  private config: AIConfig;

  constructor() {
    this.config = {
      apiKey: '',
      enabled: false
    };
    this.initializeConfig();
  }

  private initializeConfig() {
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('VITE_ANTHROPIC_API_KEY not found in environment variables');
      }

      this.config = {
        apiKey,
        enabled: true
      };
    } catch (error) {
      console.error('Failed to initialize AI configuration:', error);
    }
  }

  getConfig(): AIConfig {
    return this.config;
  }

  isEnabled(): boolean {
    return this.config.enabled && !!this.config.apiKey;
  }
}

export const configService = new ConfigService();
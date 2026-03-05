/**
 * Storage Schema
 *
 * 定义扩展的本地存储结构
 */

/**
 * AI 模型配置
 */
export interface AIModelConfig {
  provider: 'openai' | 'claude' | 'custom';
  apiKey: string;
  modelName: string;
  baseUrl?: string; // 自定义 API 的基础 URL
}

/**
 * 扩展存储架构
 */
export interface StorageSchema {
  // 用户配置
  username: string;
  enableLogging: boolean;

  // AI 模型配置
  aiModel: AIModelConfig | null;

  // 统计信息
  visitCount: number;
}

/**
 * 默认存储值
 */
export const defaultStorage: StorageSchema = {
  username: '',
  enableLogging: false,
  aiModel: null,
  visitCount: 0,
};

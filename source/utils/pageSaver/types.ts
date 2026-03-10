/**
 * Page Saver Types
 *
 * 定义页面保存功能的核心类型
 */

/**
 * 页面保存配置
 */
export interface PageSaverConfig {
  /** 是否包含 Shadow DOM (默认: false) */
  includeShadowDOM?: boolean;
  /** 是否包含 iframe (默认: false) */
  includeFrames?: boolean;
  /** 是否转换 Canvas 为图片 (默认: true) */
  convertCanvases?: boolean;
  /** 是否压缩 CSS (默认: true) */
  compressCSS?: boolean;
  /** 是否处理懒加载图片 (默认: true) */
  processLazyLoaded?: boolean;
  /** 是否处理背景图片 (默认: true) */
  processBackgroundImages?: boolean;
  /** 是否处理 srcset (默认: true) */
  processSrcSet?: boolean;
  /** 最大资源大小 (字节,默认: 10MB) */
  maxSize?: number;
  /** 进度回调 */
  onProgress?: (progress: ProgressInfo) => void;
}

/**
 * 进度信息
 */
export interface ProgressInfo {
  /** 当前阶段 */
  stage: string;
  /** 进度百分比 (0-100) */
  percentage: number;
  /** 进度消息 */
  message?: string;
  /** 当前处理的项目索引 */
  current?: number;
  /** 总项目数 */
  total?: number;
}

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: ProgressInfo) => void | Promise<void>;

/**
 * 处理结果
 */
export interface ProcessResult {
  /** 是否成功 */
  success: boolean;
  /** 生成的 HTML 内容 */
  html?: string;
  /** 错误信息 */
  error?: string;
  /** 警告信息列表 */
  warnings: string[];
}

/**
 * 保存结果
 */
export interface SaveResult {
  /** 是否成功 */
  success: boolean;
  /** 文件大小 (格式化字符串) */
  fileSize?: string;
  /** 保存耗时 (毫秒) */
  duration?: number;
  /** 处理的图片数量 */
  imagesProcessed?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 资源缓存 (URL -> Data URI 的映射) */
export type ResourceCache = Map<string, string>;

/**
 * 保存元数据
 */
export interface SaveMetadata {
  /** 原始 URL */
  url: string;
  /** 保存时间戳 */
  timestamp: number;
  /** 页面标题 */
  title: string;
}

/**
 * 保存选项
 */
export interface SaveOptions {
  /** 文件名 (可选,默认自动生成) */
  filename?: string;
}

/**
 * 资源缓存项
 */
export interface ResourceCacheItem {
  /** 资源 URL */
  url: string;
  /** 缓存的内容 (Base64 或文本) */
  content: string;
  /** MIME 类型 */
  mimeType?: string;
  /** 缓存时间 */
  timestamp: number;
}

/**
 * 资源缓存接口
 */
export interface IResourceCache {
  /** 获取缓存 */
  get(url: string): ResourceCacheItem | undefined;
  /** 设置缓存 */
  set(url: string, content: string, mimeType?: string): void;
  /** 清除缓存 */
  clear(): void;
  /** 检查是否存在 */
  has(url: string): boolean;
}

/**
 * DOM 处理器配置
 */
export interface DOMProcessorConfig {
  /** 是否包含 Shadow DOM */
  includeShadowDOM?: boolean;
  /** 是否包含 iframe */
  includeFrames?: boolean;
  /** 是否转换 Canvas */
  convertCanvases?: boolean;
}

/**
 * CSS 处理器配置
 */
export interface CSSProcessorConfig {
  /** 是否压缩 CSS */
  compress?: boolean;
  /** 基础 URL (用于解析相对路径) */
  baseURL?: string;
}

/**
 * 图片处理器配置
 */
export interface ImageProcessorConfig {
  /** 是否启用去重 */
  enableDeduplication?: boolean;
  /** 最大图片大小 (字节,0 表示无限制) */
  maxImageSize?: number;
  /** 是否处理懒加载图片 */
  processLazyLoaded?: boolean;
  /** 是否处理背景图片 */
  processBackgroundImages?: boolean;
  /** 是否处理 srcset */
  processSrcSet?: boolean;
  /** 最大资源大小 */
  maxSize?: number;
}

/**
 * HTML 生成器配置
 */
export interface HTMLGeneratorConfig {
  /** 是否添加元数据 */
  addMetadata?: boolean;
  /** 文件名格式 */
  filenameFormat?: 'title-timestamp' | 'title' | 'timestamp';
}

/**
 * Fetch 选项
 */
export interface FetchOptions {
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * 资源类型
 */
export enum ResourceType {
  CSS = 'css',
  IMAGE = 'image',
  FONT = 'font',
  OTHER = 'other',
}

/**
 * Resource Fetcher
 *
 * 负责获取外部资源(CSS、图片、字体等)
 * 实现缓存机制和 CORS 错误处理
 */

import type {IResourceCache, ResourceCacheItem, FetchOptions} from './types';

/**
 * 资源缓存实现
 */
export class ResourceCache implements IResourceCache {
  private cache = new Map<string, ResourceCacheItem>();

  get(url: string): ResourceCacheItem | undefined {
    return this.cache.get(url);
  }

  set(url: string, content: string, mimeType?: string): void {
    this.cache.set(url, {
      url,
      content,
      mimeType,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  has(url: string): boolean {
    return this.cache.has(url);
  }

  /** 获取缓存大小 */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * 资源获取器类
 */
export class ResourceFetcher {
  private cache: ResourceCache;
  private defaultOptions: FetchOptions;

  constructor(cache?: ResourceCache, options?: FetchOptions) {
    this.cache = cache || new ResourceCache();
    this.defaultOptions = {
      timeout: 30000, // 30 秒超时
      maxRetries: 1,
      ...options,
    };
  }

  /**
   * 获取资源
   *
   * @param url - 资源 URL
   * @param options - 获取选项
   * @returns 资源内容,失败返回 null
   */
  async fetchResource(
    url: string,
    options?: FetchOptions
  ): Promise<string | null> {
    // 检查缓存
    if (this.cache.has(url)) {
      const cached = this.cache.get(url);
      return cached?.content || null;
    }

    const opts = {...this.defaultOptions, ...options};

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();

      // 缓存结果
      this.cache.set(
        url,
        content,
        response.headers.get('Content-Type') || undefined
      );

      return content;
    } catch (error) {
      // CORS 错误或其他网络错误
      console.warn(`[ResourceFetcher] 无法获取资源: ${url}`, error);
      return null;
    }
  }

  /**
   * 获取二进制资源(用于图片等)
   *
   * @param url - 资源 URL
   * @returns Base64 编码的资源,失败返回 null
   */
  async fetchBinaryResource(url: string): Promise<string | null> {
    // 检查缓存
    if (this.cache.has(url)) {
      const cached = this.cache.get(url);
      return cached?.content || null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.defaultOptions.timeout
      );

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // 转换为 Base64
      const base64 = await this.blobToBase64(blob);

      // 缓存结果
      this.cache.set(url, base64, blob.type);

      return base64;
    } catch (error) {
      console.warn(`[ResourceFetcher] 无法获取二进制资源: ${url}`, error);
      return null;
    }
  }

  /**
   * 将 Blob 转换为 Base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = (): void => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 获取缓存实例
   */
  getCache(): ResourceCache {
    return this.cache;
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * 创建资源获取器的工厂函数
 */
export function createResourceFetcher(options?: FetchOptions): ResourceFetcher {
  return new ResourceFetcher(undefined, options);
}

/**
 * 简化的资源获取函数
 *
 * @param url - 资源 URL
 * @param type - 资源类型 ('text' | 'blob')
 * @param maxSize - 最大文件大小(字节)
 * @returns 资源内容 (文本或 Base64),失败返回 null
 */
export async function fetchResource(
  url: string,
  type: 'text' | 'blob' = 'text',
  maxSize?: number
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 秒超时

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 检查文件大小
    if (maxSize) {
      const contentLength = response.headers.get('Content-Length');
      if (contentLength && parseInt(contentLength) > maxSize) {
        console.warn(`[fetchResource] 文件过大: ${url}`);
        return null;
      }
    }

    if (type === 'blob') {
      const blob = await response.blob();

      // 检查实际大小
      if (maxSize && blob.size > maxSize) {
        console.warn(`[fetchResource] 文件过大: ${url}`);
        return null;
      }

      // 转换为 Base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = (): void => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      return await response.text();
    }
  } catch (error) {
    console.warn(`[fetchResource] 无法获取资源: ${url}`, error);
    return null;
  }
}

/**
 * Image Processor
 *
 * 负责将图片转换为 Base64,处理各种图片源
 */

import type {ImageProcessorConfig, ResourceCache} from './types';
import {fetchResource} from './resource-fetcher';

/**
 * 图片处理器类
 */
export class ImageProcessor {
  private config: ImageProcessorConfig;
  private cache: ResourceCache;
  private processedImages = new Set<string>();

  constructor(config?: ImageProcessorConfig, cache?: ResourceCache) {
    this.config = {
      processLazyLoaded: true,
      processBackgroundImages: true,
      processSrcSet: true,
      maxSize: 10 * 1024 * 1024, // 10MB
      ...config,
    };
    this.cache = cache || new Map();
  }

  /**
   * 将图片转换为 Base64
   */
  async convertToBase64(url: string): Promise<string | null> {
    if (!url) return null;

    // 跳过已经转换过的图片
    if (this.processedImages.has(url)) {
      const cached = this.cache.get(url);
      return cached || null;
    }

    // 跳过 data URI
    if (url.startsWith('data:')) {
      return url;
    }

    try {
      const dataURL = await fetchResource(url, 'blob', this.config.maxSize);

      if (dataURL) {
        this.cache.set(url, dataURL);
        this.processedImages.add(url);
        return dataURL;
      }

      return null;
    } catch (error) {
      console.warn(`[ImageProcessor] 无法转换图片: ${url}`, error);
      return null;
    }
  }

  /**
   * 处理 <img> 标签
   */
  async processImgTags(doc: Document): Promise<void> {
    const images = doc.querySelectorAll('img');

    for (const img of images) {
      // 优先使用 data-src (懒加载)
      const src = img.getAttribute('data-src') || img.getAttribute('src') || '';

      if (!src) continue;

      // 转换为 Base64
      const base64 = await this.convertToBase64(src);

      if (base64) {
        img.src = base64;

        // 清理懒加载属性
        img.removeAttribute('data-src');
        img.removeAttribute('data-original');
      }
    }
  }

  /**
   * 处理 CSS 背景图
   */
  async processBackgroundImages(doc: Document): Promise<void> {
    if (!this.config.processBackgroundImages) {
      return;
    }

    const allElements = doc.querySelectorAll('*');

    for (const element of allElements) {
      const style = element.getAttribute('style');

      if (!style || !style.includes('background-image')) {
        continue;
      }

      // 提取 background-image 中的 URL
      const urlMatch = style.match(
        /background-image:\s*url\(['"]?([^'")]+)['"]?\)/
      );

      if (urlMatch) {
        const url = urlMatch[1];

        if (!url) continue;

        // 跳过 data URI 和绝对 URL
        if (
          url.startsWith('data:') ||
          url.startsWith('http://') ||
          url.startsWith('https://')
        ) {
          continue;
        }

        const base64 = await this.convertToBase64(url);

        if (base64) {
          const newStyle = style.replace(
            /background-image:\s*url\(['"]?[^'")]+['"]?\)/,
            `background-image: url('${base64}')`
          );
          element.setAttribute('style', newStyle);
        }
      }
    }
  }

  /**
   * 处理 srcset 属性
   */
  async processSrcSet(doc: Document): Promise<void> {
    if (!this.config.processSrcSet) {
      return;
    }

    const images = doc.querySelectorAll('img[srcset], source[srcset]');

    for (const img of images) {
      const srcset = img.getAttribute('srcset');

      if (!srcset) continue;

      // 解析 srcset
      const sources = srcset.split(',').map((s) => s.trim().split(/\s+/));

      const processedSources: string[] = [];

      for (const item of sources) {
        const url = item[0];
        const descriptor = item[1];

        if (!url) continue;

        const base64 = await this.convertToBase64(url);

        if (base64) {
          if (descriptor) {
            processedSources.push(`${base64} ${descriptor}`);
          } else {
            processedSources.push(base64);
          }
        } else {
          // 保留原始 URL
          if (descriptor) {
            processedSources.push(`${url} ${descriptor}`);
          } else {
            processedSources.push(url);
          }
        }
      }

      img.setAttribute('srcset', processedSources.join(', '));
    }
  }

  /**
   * 处理 <picture> 元素
   */
  async processPictureElements(doc: Document): Promise<void> {
    const pictures = doc.querySelectorAll('picture');

    for (const picture of pictures) {
      // 处理 source 元素
      const sources = picture.querySelectorAll('source');

      for (const source of sources) {
        const srcset = source.getAttribute('srcset');

        if (srcset) {
          await this.processSrcSet(doc);
        }
      }

      // 处理 img 元素
      const img = picture.querySelector('img');

      if (img) {
        await this.processImgTags(doc);
      }
    }
  }

  /**
   * 处理所有图片
   */
  async processAll(doc: Document): Promise<void> {
    // 1. 处理 <img> 标签
    await this.processImgTags(doc);

    // 2. 处理 srcset
    await this.processSrcSet(doc);

    // 3. 处理 <picture> 元素
    await this.processPictureElements(doc);

    // 4. 处理背景图
    await this.processBackgroundImages(doc);
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {total: number; unique: number} {
    return {
      total: this.processedImages.size,
      unique: this.cache.size,
    };
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.processedImages.clear();
    this.cache.clear();
  }
}

/**
 * 创建图片处理器的工厂函数
 */
export function createImageProcessor(
  config?: ImageProcessorConfig,
  cache?: ResourceCache
): ImageProcessor {
  return new ImageProcessor(config, cache);
}

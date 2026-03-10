/**
 * PageSaver - 主入口
 *
 * 协调所有处理器,提供统一的页面保存接口
 */

import {DOMProcessor, createDOMProcessor} from './dom-processor';
import {CSSProcessor, createCSSProcessor} from './css-processor';
import {ImageProcessor, createImageProcessor} from './image-processor';
import {HTMLGenerator, createHTMLGenerator} from './html-generator';
import type {
  PageSaverConfig,
  ProgressCallback,
  ProgressInfo,
  ResourceCache,
  SaveResult,
} from './types';

/**
 * PageSaver 主类
 */
export class PageSaver {
  private config: PageSaverConfig;
  private domProcessor: DOMProcessor;
  private cssProcessor: CSSProcessor;
  private imageProcessor: ImageProcessor;
  private htmlGenerator: HTMLGenerator;
  private cache: ResourceCache;

  constructor(config?: PageSaverConfig) {
    this.config = {
      includeShadowDOM: false,
      includeFrames: false,
      processLazyLoaded: true,
      processBackgroundImages: true,
      processSrcSet: true,
      maxSize: 10 * 1024 * 1024,
      ...config,
    };

    // 创建共享缓存
    this.cache = new Map();

    // 初始化处理器
    this.domProcessor = createDOMProcessor({
      includeShadowDOM: this.config.includeShadowDOM,
      includeFrames: this.config.includeFrames,
      convertCanvases: true,
    });

    this.cssProcessor = createCSSProcessor({
      compress: true,
      baseURL: typeof window !== 'undefined' ? window.location.href : '',
    });

    this.imageProcessor = createImageProcessor(
      {
        processLazyLoaded: this.config.processLazyLoaded,
        processBackgroundImages: this.config.processBackgroundImages,
        processSrcSet: this.config.processSrcSet,
        maxSize: this.config.maxSize,
      },
      this.cache
    );

    this.htmlGenerator = createHTMLGenerator();
  }

  /**
   * 保存页面
   */
  async savePage(onProgress?: ProgressCallback): Promise<SaveResult> {
    const startTime = Date.now();

    try {
      // 1. 克隆 DOM
      await this.reportProgress(onProgress, {
        stage: 'cloning-dom',
        message: '正在克隆 DOM...',
        percentage: 0,
      });

      const doc = document.cloneNode(true) as Document;

      // 1.5. 移除插件 UI
      await this.reportProgress(onProgress, {
        stage: 'removing-plugin-ui',
        message: '正在移除插件 UI...',
        percentage: 5,
      });

      this.domProcessor.removePluginUI(doc);

      // 2. 处理 Canvas
      await this.reportProgress(onProgress, {
        stage: 'processing-canvas',
        message: '正在处理 Canvas 元素...',
        percentage: 15,
      });

      this.domProcessor.convertCanvases(doc);

      // 3. 处理 Shadow DOM (如果启用)
      if (this.config.includeShadowDOM) {
        await this.reportProgress(onProgress, {
          stage: 'processing-shadow-dom',
          message: '正在处理 Shadow DOM...',
          percentage: 25,
        });

        this.domProcessor.processShadowDOM(doc);
      }

      // 4. 处理 iframe (如果启用)
      if (this.config.includeFrames) {
        await this.reportProgress(onProgress, {
          stage: 'processing-frames',
          message: '正在处理 iframe...',
          percentage: 35,
        });

        this.domProcessor.processFrames(doc);
      }

      // 5. 处理 CSS
      await this.reportProgress(onProgress, {
        stage: 'processing-css',
        message: '正在处理 CSS...',
        percentage: 45,
      });

      await this.cssProcessor.inlineCSS(doc);

      // 6. 处理图片
      await this.reportProgress(onProgress, {
        stage: 'processing-images',
        message: '正在转换图片...',
        percentage: 55,
      });

      await this.imageProcessor.processAll(doc);

      const imageStats = this.imageProcessor.getCacheStats();
      await this.reportProgress(onProgress, {
        stage: 'processing-images',
        message: `已处理 ${imageStats.unique} 张图片`,
        percentage: 75,
      });

      // 7. 生成 HTML
      await this.reportProgress(onProgress, {
        stage: 'generating-html',
        message: '正在生成 HTML...',
        percentage: 85,
      });

      const html = this.htmlGenerator.generate(doc);
      const fileSize = this.htmlGenerator.getFileSize(html);

      // 8. 触发下载
      await this.reportProgress(onProgress, {
        stage: 'downloading',
        message: '正在下载...',
        percentage: 95,
      });

      await this.htmlGenerator.save(doc);

      // 完成
      const duration = Date.now() - startTime;

      await this.reportProgress(onProgress, {
        stage: 'complete',
        message: '保存完成!',
        percentage: 100,
      });

      return {
        success: true,
        fileSize,
        duration,
        imagesProcessed: imageStats.unique,
      };
    } catch (error) {
      // 错误处理
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[PageSaver] 保存失败:', error);

      await this.reportProgress(onProgress, {
        stage: 'error',
        message: `保存失败: ${errorMessage}`,
        percentage: 0,
      });

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      // 清理缓存
      this.imageProcessor.clearCache();
    }
  }

  /**
   * 报告进度
   */
  private async reportProgress(
    onProgress: ProgressCallback | undefined,
    info: ProgressInfo
  ): Promise<void> {
    if (onProgress) {
      try {
        await onProgress(info);
      } catch (error) {
        console.warn('[PageSaver] 进度回调出错:', error);
      }
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PageSaverConfig>): void {
    this.config = {...this.config, ...config};
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {total: number; unique: number} {
    return this.imageProcessor.getCacheStats();
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.imageProcessor.clearCache();
  }
}

/**
 * 创建 PageSaver 实例的工厂函数
 */
export function createPageSaver(config?: PageSaverConfig): PageSaver {
  return new PageSaver(config);
}

/**
 * 快捷函数:保存当前页面
 */
export async function savePage(
  config?: PageSaverConfig,
  onProgress?: ProgressCallback
): Promise<SaveResult> {
  const saver = createPageSaver(config);
  return saver.savePage(onProgress);
}

// 默认导出
export default PageSaver;

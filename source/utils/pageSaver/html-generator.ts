/**
 * HTML Generator
 *
 * 负责生成最终的 HTML 文档并触发下载
 */

import type {SaveOptions, SaveMetadata} from './types';

/**
 * HTML 生成器类
 */
export class HTMLGenerator {
  private metadata: SaveMetadata | null = null;

  /**
   * 添加元数据
   */
  addMetadata(doc: Document, metadata?: Partial<SaveMetadata>): void {
    this.metadata = {
      url:
        metadata?.url ||
        (typeof window !== 'undefined' ? window.location.href : ''),
      timestamp: metadata?.timestamp || Date.now(),
      title: metadata?.title || doc.title,
    };

    // 创建 meta 标签
    const metaTag = doc.createElement('meta');
    metaTag.name = 'saved-by';
    metaTag.content = 'PickBetter PageSaver';
    doc.head.appendChild(metaTag);

    const urlTag = doc.createElement('meta');
    urlTag.name = 'original-url';
    urlTag.content = this.metadata.url;
    doc.head.appendChild(urlTag);

    const dateTag = doc.createElement('meta');
    dateTag.name = 'save-date';
    dateTag.content = new Date(this.metadata.timestamp).toISOString();
    doc.head.appendChild(dateTag);
  }

  /**
   * 生成 HTML 文档
   */
  generate(doc: Document): string {
    const doctype = '<!DOCTYPE html>';
    const html = doc.documentElement.outerHTML;

    return `${doctype}\n${html}`;
  }

  /**
   * 生成文件名
   */
  generateFilename(): string {
    if (!this.metadata) {
      return `saved-page-${Date.now()}.html`;
    }

    // 清理文件名中的非法字符
    const cleanTitle = this.metadata.title
      .replace(/[^\w\s-]/gi, '') // 移除非法字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .substring(0, 50); // 限制长度

    return `${cleanTitle}-${this.metadata.timestamp}.html`;
  }

  /**
   * 触发文件下载
   */
  download(html: string, filename?: string): void {
    try {
      // 创建 Blob
      const blob = new Blob([html], {type: 'text/html'});
      const url = URL.createObjectURL(blob);

      // 创建临时链接并触发下载
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || this.generateFilename();
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[HTMLGenerator] 下载失败:', error);
      throw new Error('下载失败,请检查浏览器权限');
    }
  }

  /**
   * 完整的保存流程
   */
  async save(
    doc: Document,
    metadata?: Partial<SaveMetadata>,
    options?: SaveOptions
  ): Promise<void> {
    // 1. 添加元数据
    this.addMetadata(doc, metadata);

    // 2. 生成 HTML
    const html = this.generate(doc);

    // 3. 触发下载
    const filename = options?.filename || this.generateFilename();
    this.download(html, filename);
  }

  /**
   * 获取文件大小(格式化)
   */
  getFileSize(html: string): string {
    const bytes = new Blob([html]).size;
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

/**
 * 创建 HTML 生成器的工厂函数
 */
export function createHTMLGenerator(): HTMLGenerator {
  return new HTMLGenerator();
}

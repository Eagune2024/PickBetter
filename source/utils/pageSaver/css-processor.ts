/**
 * CSS Processor
 *
 * 负责提取、内联和转换 CSS
 */

import type {CSSProcessorConfig} from './types';

/**
 * CSS 处理器类
 */
export class CSSProcessor {
  private config: CSSProcessorConfig;

  constructor(config?: CSSProcessorConfig) {
    this.config = {
      compress: true,
      baseURL: typeof window !== 'undefined' ? window.location.href : '',
      ...config,
    };
  }

  /**
   * 提取内部样式
   */
  extractInlineStyles(doc: Document): string {
    const styles = doc.querySelectorAll('style');
    let css = '';

    styles.forEach((style) => {
      css += style.textContent + '\n';
    });

    return css;
  }

  /**
   * 获取外部 CSS
   */
  async fetchExternalCSS(doc: Document): Promise<string> {
    const links = doc.querySelectorAll('link[rel="stylesheet"]');
    let css = '';

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;

      try {
        // 解析绝对 URL
        const absoluteURL = new URL(href, this.config.baseURL).href;

        const response = await fetch(absoluteURL);
        if (response.ok) {
          const content = await response.text();
          css += content + '\n';
        }
      } catch (error) {
        console.warn(`[CSSProcessor] 无法加载 CSS: ${href}`, error);
      }
    }

    return css;
  }

  /**
   * 处理 CSS 中的 URL
   */
  processCSSURLs(css: string): string {
    return css.replace(/url\(['"]?([^'")]+)['"]?\)/g, (match, url) => {
      // 跳过 data URI 和绝对 URL
      if (
        url.startsWith('data:') ||
        url.startsWith('http://') ||
        url.startsWith('https://')
      ) {
        return match;
      }

      // 转换为绝对 URL
      try {
        const absoluteURL = new URL(url, this.config.baseURL).href;
        return `url('${absoluteURL}')`;
      } catch {
        return match;
      }
    });
  }

  /**
   * 处理 @import 规则
   */
  async processImports(css: string): Promise<string> {
    const importRegex =
      /@import\s+(?:url\(['"]?([^'")]+)['"]?\)|['"]([^'")]+)['"])\s*;/g;

    let match;
    let processedCSS = css;

    // 递归处理所有 @import
    while ((match = importRegex.exec(css)) !== null) {
      const url = match[1] || match[2];

      if (!url) continue;

      try {
        const absoluteURL = new URL(url, this.config.baseURL).href;
        const response = await fetch(absoluteURL);

        if (response.ok) {
          const importedCSS = await response.text();
          // 替换 @import 规则为实际内容
          processedCSS = processedCSS.replace(match[0], importedCSS);
        }
      } catch (error) {
        console.warn(`[CSSProcessor] 无法加载 @import: ${url}`, error);
      }
    }

    return processedCSS;
  }

  /**
   * 内联所有 CSS
   */
  async inlineCSS(doc: Document): Promise<void> {
    // 1. 提取内部样式
    const inlineCSS = this.extractInlineStyles(doc);

    // 2. 获取外部 CSS
    const externalCSS = await this.fetchExternalCSS(doc);

    // 3. 合并所有 CSS
    let allCSS = inlineCSS + externalCSS;

    // 4. 处理 @import
    allCSS = await this.processImports(allCSS);

    // 5. 处理 URL
    allCSS = this.processCSSURLs(allCSS);

    // 6. 可选压缩
    if (this.config.compress) {
      allCSS = this.compressCSS(allCSS);
    }

    // 7. 创建新的 style 标签
    const styleElement = doc.createElement('style');
    styleElement.textContent = allCSS;

    // 8. 移除旧的 style 和 link 标签
    const oldStyles = doc.querySelectorAll('style, link[rel="stylesheet"]');
    oldStyles.forEach((el) => el.remove());

    // 9. 插入新的 style 标签
    doc.head.appendChild(styleElement);
  }

  /**
   * 压缩 CSS
   */
  private compressCSS(css: string): string {
    // 移除注释
    let compressed = css.replace(/\/\*[\s\S]*?\*\//g, '');

    // 移除多余空白
    compressed = compressed.replace(/\s+/g, ' ').trim();

    // 移除属性前后的空格
    compressed = compressed.replace(/\s*{\s*/g, '{').replace(/\s*}\s*/g, '}');
    compressed = compressed.replace(/\s*:\s*/g, ':').replace(/\s*;\s*/g, ';');

    return compressed;
  }
}

/**
 * 创建 CSS 处理器的工厂函数
 */
export function createCSSProcessor(config?: CSSProcessorConfig): CSSProcessor {
  return new CSSProcessor(config);
}

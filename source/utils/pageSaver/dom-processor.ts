/**
 * DOM Processor
 *
 * 负责 DOM 克隆、序列化、Canvas 转换等
 */

import type {DOMProcessorConfig} from './types';

/**
 * DOM 处理器类
 */
export class DOMProcessor {
  private config: DOMProcessorConfig;

  constructor(config?: DOMProcessorConfig) {
    this.config = {
      includeShadowDOM: false,
      includeFrames: false,
      convertCanvases: true,
      ...config,
    };
  }

  /**
   * 克隆文档
   */
  cloneDocument(document: Document): Document {
    // 克隆整个文档
    const docClone = document.cloneNode(true) as Document;

    return docClone;
  }

  /**
   * 处理 Canvas 元素
   */
  convertCanvases(doc: Document): void {
    if (!this.config.convertCanvases) {
      return;
    }

    const canvases = doc.querySelectorAll('canvas');

    canvases.forEach((canvas) => {
      try {
        // 将 Canvas 转换为图片
        const dataURL = canvas.toDataURL('image/png');

        // 创建 img 元素
        const img = doc.createElement('img');
        img.src = dataURL;
        img.setAttribute('data-canvas', 'true');

        // 复制 Canvas 的属性
        const width = canvas.getAttribute('width');
        const height = canvas.getAttribute('height');
        const className = canvas.getAttribute('class');
        const id = canvas.getAttribute('id');
        const style = canvas.getAttribute('style');

        if (width) img.setAttribute('width', width);
        if (height) img.setAttribute('height', height);
        if (className) img.setAttribute('class', className);
        if (id) img.setAttribute('id', id);
        if (style) img.setAttribute('style', style);

        // 替换 Canvas
        canvas.replaceWith(img);
      } catch (error) {
        console.warn('[DOMProcessor] 无法转换 Canvas:', error);
      }
    });
  }

  /**
   * 处理 Shadow DOM (可选,高级功能)
   */
  processShadowDOM(doc: Document): void {
    if (!this.config.includeShadowDOM) {
      return;
    }

    // 查找所有可能包含 Shadow DOM 的元素
    const allElements = doc.querySelectorAll('*');

    allElements.forEach((element: Element) => {
      const shadowRoot = element.shadowRoot;

      if (shadowRoot) {
        // 序列化 Shadow Root 内容
        const shadowContent = shadowRoot.innerHTML;

        // 创建一个容器来保存 Shadow DOM 内容
        const shadowContainer = doc.createElement('shadow-root');
        shadowContainer.innerHTML = shadowContent;

        // 添加到元素内
        element.appendChild(shadowContainer);
      }
    });
  }

  /**
   * 处理 iframe (可选,高级功能)
   */
  processFrames(doc: Document): void {
    if (!this.config.includeFrames) {
      return;
    }

    const frames = doc.querySelectorAll('iframe, frame');

    frames.forEach((frame) => {
      try {
        // 仅处理同源 iframe
        const frameDoc = (frame as HTMLIFrameElement).contentDocument;

        if (frameDoc) {
          // 序列化 iframe 文档
          const frameContent = frameDoc.documentElement.outerHTML;

          // 创建一个容器保存 iframe 内容
          const frameContainer = doc.createElement('iframe-content');
          frameContainer.innerHTML = frameContent;

          // 替换 iframe
          frame.replaceWith(frameContainer);
        }
        // 跨源 iframe 保持原样
      } catch {
        // 跨源限制,保持原样
        console.warn('[DOMProcessor] 无法访问 iframe 内容 (跨源限制)');
      }
    });
  }
}

/**
 * 创建 DOM 处理器的工厂函数
 */
export function createDOMProcessor(config?: DOMProcessorConfig): DOMProcessor {
  return new DOMProcessor(config);
}

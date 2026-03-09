import type {ElementInfo} from '../../types/operations';
import {StyleAnalyzer} from '../../utils/styleAnalyzer';

/**
 * 元素信息提取器
 * 负责提取和分析 DOM 元素的相关信息
 */
export class ElementInfoExtractor {
  /**
   * 判断用户指令是否模糊
   */
  isFuzzyPrompt(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();

    const specificKeywords = [
      '颜色',
      '背景',
      '字体',
      '文字',
      '大小',
      '尺寸',
      '边距',
      '圆角',
      '边框',
      '阴影',
      '透明度',
      '宽度',
      '高度',
      'padding',
      'margin',
      'border',
      'color',
      'background',
      'font',
      'size',
      'width',
      'height',
      'delete',
      'remove',
      '删除',
      '隐藏',
      '显示',
      '添加',
    ];

    const fuzzyKeywords = [
      '现代',
      '时尚',
      '复古',
      '简洁',
      '简约',
      '华丽',
      '扁平',
      '立体',
      '优雅',
      '专业',
      '友好',
      '严肃',
      '活泼',
      '更好',
      '更差',
      '更美',
      '更协调',
      '更统一',
      '更突出',
      '更低调',
      '更醒目',
      '优化',
      '改进',
      '提升',
      '改善',
      '美化',
      'modern',
      'elegant',
      'minimal',
      'consistent',
      'prominent',
    ];

    const hasSpecific = specificKeywords.some((kw) => lowerPrompt.includes(kw));
    const hasFuzzy = fuzzyKeywords.some((kw) => lowerPrompt.includes(kw));

    if (hasSpecific && !hasFuzzy) return false;

    return hasFuzzy;
  }

  /**
   * 提取元素信息
   */
  extractElementInfo(
    element: HTMLElement | null,
    options: {
      includeParent?: boolean;
      includeSiblings?: boolean;
      includeDesignSystem?: boolean;
    } = {}
  ): ElementInfo {
    if (!element) {
      return {
        tagName: '',
        outerHTML: '',
        computedStyles: {},
      };
    }

    const computedStyles = window.getComputedStyle(element);

    const styleProps = [
      'color',
      'backgroundColor',
      'borderColor',
      'outlineColor',
      'boxShadow',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'lineHeight',
      'letterSpacing',
      'textAlign',
      'textDecoration',
      'textTransform',
      'verticalAlign',
      'display',
      'position',
      'flexDirection',
      'justifyContent',
      'alignItems',
      'gap',
      'gridTemplateColumns',
      'gridTemplateRows',
      'width',
      'height',
      'minWidth',
      'minHeight',
      'maxWidth',
      'maxHeight',
      'padding',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'margin',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'border',
      'borderRadius',
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderBottomLeftRadius',
      'borderBottomRightRadius',
      'boxShadow',
      'opacity',
      'filter',
      'cursor',
      'transition',
      'transform',
    ];

    const styles: Record<string, string> = {};
    styleProps.forEach((prop) => {
      const value = computedStyles.getPropertyValue(prop);
      if (value) {
        styles[prop] = value;
      }
    });

    const baseInfo: ElementInfo = {
      tagName: element.tagName,
      id: element.id || undefined,
      className: element.className || undefined,
      outerHTML: element.outerHTML.slice(0, 1000),
      textContent: element.textContent?.slice(0, 100),
      computedStyles: styles,
    };

    if (options.includeParent) {
      baseInfo.parentContext = this.extractParentContext(element);
    }

    if (options.includeSiblings) {
      baseInfo.siblingContext = this.extractSiblingContext(element);
    }

    if (options.includeDesignSystem) {
      const analyzer = new StyleAnalyzer();
      baseInfo.pageDesignSystem = analyzer.analyzePageDesignSystem();
    }

    return baseInfo;
  }

  /**
   * 提取父元素上下文
   */
  private extractParentContext(element: HTMLElement | null):
    | {
        tagName: string;
        className?: string;
        computedStyles: Record<string, string>;
      }
    | undefined {
    if (!element) return undefined;
    const parent = element.parentElement;
    if (!parent) return undefined;

    const computedStyles = window.getComputedStyle(parent);
    const styles: Record<string, string> = {};

    const styleProps = [
      'color',
      'backgroundColor',
      'fontSize',
      'fontWeight',
      'fontFamily',
      'padding',
      'margin',
      'border',
      'borderRadius',
      'boxShadow',
      'display',
    ];

    styleProps.forEach((prop) => {
      const value = computedStyles.getPropertyValue(prop);
      if (value) {
        styles[prop] = value;
      }
    });

    return {
      tagName: parent.tagName,
      className: parent.className || undefined,
      computedStyles: styles,
    };
  }

  /**
   * 提取兄弟元素上下文
   */
  private extractSiblingContext(element: HTMLElement | null): Array<{
    tagName: string;
    className?: string;
    computedStyles: Record<string, string>;
    similarity: number;
  }> {
    if (!element) return [];

    const parent = element.parentElement;
    if (!parent) return [];

    const siblings = Array.from(parent.children)
      .filter((child) => child !== element)
      .slice(0, 5) as HTMLElement[];

    const siblingContext = siblings.map((sibling) => {
      const computedStyles = window.getComputedStyle(sibling);
      const styles: Record<string, string> = {};

      const styleProps = [
        'color',
        'backgroundColor',
        'fontSize',
        'fontWeight',
        'fontFamily',
        'padding',
        'margin',
        'border',
        'borderRadius',
        'boxShadow',
        'display',
      ];

      styleProps.forEach((prop) => {
        const value = computedStyles.getPropertyValue(prop);
        if (value) {
          styles[prop] = value;
        }
      });

      return {
        tagName: sibling.tagName,
        className: sibling.className || undefined,
        computedStyles: styles,
        similarity: this.calculateSimilarity(element, sibling),
      };
    });

    return siblingContext
      .sort((a, b) => b.similarity - a.similarity)
      .filter((item) => item.similarity > 0.3);
  }

  /**
   * 计算两个元素的样式相似度
   */
  private calculateSimilarity(elem1: HTMLElement, elem2: HTMLElement): number {
    const style1 = window.getComputedStyle(elem1);
    const style2 = window.getComputedStyle(elem2);

    const keyProps = [
      'display',
      'color',
      'backgroundColor',
      'fontSize',
      'fontWeight',
      'borderRadius',
      'padding',
      'margin',
    ];

    let matchCount = 0;
    keyProps.forEach((prop) => {
      if (style1.getPropertyValue(prop) === style2.getPropertyValue(prop)) {
        matchCount++;
      }
    });

    return matchCount / keyProps.length;
  }
}

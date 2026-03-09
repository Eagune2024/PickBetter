/**
 * Style Analyzer
 *
 * 分析页面设计系统，包括配色、字体、间距、圆角和阴影
 */

import type {
  ColorPalette,
  TypographySystem,
  SpacingSystem,
  BorderRadiusSystem,
  BoxShadowSystem,
  PageDesignSystem,
} from '../types/operations';

/**
 * 样式分析器类
 */
export class StyleAnalyzer {
  /**
   * 分析完整页面设计系统
   *
   * @returns 页面设计系统信息
   */
  analyzePageDesignSystem(): PageDesignSystem {
    return {
      colorPalette: this.analyzeColorPalette(),
      typography: this.analyzeTypographySystem(),
      spacing: this.analyzeSpacingSystem(),
      borderRadius: this.analyzeBorderRadiusSystem(),
      boxShadow: this.analyzeBoxShadowSystem(),
    };
  }

  /**
   * 分析页面配色方案
   *
   * @returns 配色方案
   */
  private analyzeColorPalette(): ColorPalette {
    const colors = {
      primary: [] as string[],
      secondary: [] as string[],
      background: [] as string[],
      text: [] as string[],
      border: [] as string[],
    };

    // 扫描常见元素
    const buttons = document.querySelectorAll('button, [role="button"], .btn');
    const links = document.querySelectorAll('a, [role="link"]');
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const cards = document.querySelectorAll('.card, [class*="card"]');
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;

    // 提取主色调（按钮、链接）
    buttons.forEach((btn) => {
      const style = window.getComputedStyle(btn as HTMLElement);
      const bg = style.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        colors.primary.push(bg);
      }
    });

    links.forEach((link) => {
      const style = window.getComputedStyle(link as HTMLElement);
      const color = style.color;
      if (color) {
        colors.primary.push(color);
      }
    });

    // 提取背景色
    colors.background.push(bodyBg);
    cards.forEach((card) => {
      const style = window.getComputedStyle(card as HTMLElement);
      const bg = style.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)') {
        colors.background.push(bg);
      }
    });

    // 提取文本色
    const bodyText = window.getComputedStyle(document.body).color;
    colors.text.push(bodyText);
    headings.forEach((heading) => {
      const style = window.getComputedStyle(heading as HTMLElement);
      colors.text.push(style.color);
    });

    // 提取边框色
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      const style = window.getComputedStyle(input as HTMLElement);
      const border = style.borderColor;
      if (border && border !== 'rgba(0, 0, 0, 0)') {
        colors.border.push(border);
      }
    });

    // 去重并限制数量
    return {
      primary: this.deduplicateColors(colors.primary).slice(0, 5),
      secondary: this.deduplicateColors(colors.secondary).slice(0, 5),
      background: this.deduplicateColors(colors.background).slice(0, 3),
      text: this.deduplicateColors(colors.text).slice(0, 5),
      border: this.deduplicateColors(colors.border).slice(0, 3),
    };
  }

  /**
   * 分析字体系统
   *
   * @returns 字体系统信息
   */
  private analyzeTypographySystem(): TypographySystem {
    const fontFamilies = new Set<string>();
    const fontSizes = new Set<number>();
    const fontWeights = new Set<number>();
    const lineHeights = new Set<number>();

    // 扫描所有文本元素
    const textElements = document.querySelectorAll(
      'p, span, div, h1, h2, h3, h4, h5, h6, button, a, input'
    );

    textElements.forEach((elem) => {
      const style = window.getComputedStyle(elem as HTMLElement);

      fontFamilies.add(style.fontFamily);

      const fontSize = parseFloat(style.fontSize);
      if (!isNaN(fontSize)) fontSizes.add(fontSize);

      const fontWeight = parseInt(style.fontWeight);
      if (!isNaN(fontWeight)) fontWeights.add(fontWeight);

      const lineHeight = parseFloat(style.lineHeight);
      if (!isNaN(lineHeight)) lineHeights.add(lineHeight);
    });

    return {
      fontFamilies: Array.from(fontFamilies).slice(0, 3),
      fontSizeScale: Array.from(fontSizes)
        .sort((a, b) => a - b)
        .slice(0, 10),
      fontWeightScale: Array.from(fontWeights).sort((a, b) => a - b),
      lineHeights: Array.from(lineHeights).slice(0, 5),
    };
  }

  /**
   * 分析间距系统
   *
   * @returns 间距系统信息
   */
  private analyzeSpacingSystem(): SpacingSystem {
    const spacingValues = new Set<number>();

    // 扫描常见元素的 padding 和 margin
    const elements = document.querySelectorAll('div, button, .card, section');

    elements.forEach((elem) => {
      const style = window.getComputedStyle(elem as HTMLElement);

      [
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'marginTop',
        'marginRight',
        'marginBottom',
        'marginLeft',
      ].forEach((prop) => {
        const value = parseFloat(
          style.getPropertyValue(prop as keyof CSSStyleDeclaration)
        );
        if (!isNaN(value) && value > 0) {
          spacingValues.add(value);
        }
      });
    });

    const sortedValues = Array.from(spacingValues).sort((a, b) => a - b);

    // 找出最基础的间距单位（通常是4或8的倍数）
    const commonDivisors = [4, 8, 16];
    let rhythmUnit = 8; // 默认值

    for (const divisor of commonDivisors) {
      const allDivisible = sortedValues.every(
        (v) => v % divisor === 0 || v < divisor
      );
      if (allDivisible) {
        rhythmUnit = divisor;
        break;
      }
    }

    return {
      commonValues: sortedValues.slice(0, 10),
      rhythmUnit,
    };
  }

  /**
   * 分析圆角系统
   *
   * @returns 圆角系统信息
   */
  private analyzeBorderRadiusSystem(): BorderRadiusSystem {
    const radiusValues = new Set<number>();

    const elements = document.querySelectorAll(
      'button, .card, input, [class*="box"], [class*="card"]'
    );

    elements.forEach((elem) => {
      const style = window.getComputedStyle(elem as HTMLElement);
      const radius = parseFloat(style.borderRadius);
      if (!isNaN(radius) && radius > 0) {
        radiusValues.add(radius);
      }
    });

    return {
      commonValues: Array.from(radiusValues)
        .sort((a, b) => a - b)
        .slice(0, 5),
    };
  }

  /**
   * 分析阴影系统
   *
   * @returns 阴影系统信息
   */
  private analyzeBoxShadowSystem(): BoxShadowSystem {
    const shadows = new Set<string>();

    const elements = document.querySelectorAll(
      '.card, button, [class*="shadow"], [class*="elevated"]'
    );

    elements.forEach((elem) => {
      const style = window.getComputedStyle(elem as HTMLElement);
      const shadow = style.boxShadow;
      if (shadow && shadow !== 'none') {
        shadows.add(shadow);
      }
    });

    return {
      commonPatterns: Array.from(shadows).slice(0, 5),
    };
  }

  /**
   * 辅助方法：颜色去重
   *
   * @param colors - 颜色数组
   * @returns 去重后的颜色数组
   */
  private deduplicateColors(colors: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const color of colors) {
      // 规范化颜色值（处理 rgb/rgba/hex 等）
      const normalized = this.normalizeColor(color);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(color);
      }
    }

    return result;
  }

  /**
   * 规范化颜色值
   *
   * @param color - 颜色字符串
   * @returns 规范化后的颜色值
   */
  private normalizeColor(color: string): string {
    // 创建临时元素来获取规范化的颜色值
    const temp = document.createElement('div');
    temp.style.color = color;
    document.body.appendChild(temp);
    const computed = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);
    return computed;
  }
}

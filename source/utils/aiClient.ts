/**
 * AI Client
 *
 * 封装不同AI Provider的API调用
 * 支持 OpenAI、Claude、Z.ai 和自定义API
 */

import type {AIModelConfig} from '../types/storage';
import type {ElementInfo, AIResponse} from '../types/operations';

/**
 * 修改请求
 */
export interface ModificationRequest {
  prompt: string;
  elementInfo: ElementInfo;
}

/**
 * AI Client类
 */
export class AIClient {
  private readonly config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  /**
   * 请求AI进行DOM修改
   *
   * @param request - 修改请求
   * @returns AI响应，包含操作数组
   */
  async requestModification(request: ModificationRequest): Promise<AIResponse> {
    try {
      // 构建prompt
      const prompt = this.buildPrompt(request);

      // 根据provider调用不同的API
      let response: any;
      switch (this.config.provider) {
        case 'openai':
          response = await this.callOpenAI(prompt);
          break;
        case 'claude':
          response = await this.callClaude(prompt);
          break;
        case 'zai':
          response = await this.callZAI(prompt);
          break;
        case 'custom':
          response = await this.callCustom(prompt);
          break;
        default:
          throw new Error(`不支持的AI provider: ${this.config.provider}`);
      }

      // 解析响应
      return this.parseResponse(response, this.config.provider);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[AIClient] 请求AI失败:', errorMessage);
      throw new Error(`AI请求失败: ${errorMessage}`);
    }
  }

  /**
   * 构建发送给AI的prompt
   *
   * @param request - 修改请求
   * @returns 格式化的prompt字符串
   */
  private buildPrompt(request: ModificationRequest): string {
    const {prompt, elementInfo} = request;

    return `
你是一个Web元素修改助手。用户希望对页面元素进行修改。

【用户的请求】
${prompt}

【目标元素信息】
标签: ${elementInfo.tagName}
${elementInfo.id ? `ID: ${elementInfo.id}` : ''}
${elementInfo.className ? `类名: ${elementInfo.className}` : ''}
文本内容: ${elementInfo.textContent?.slice(0, 100) || ''}
当前样式: ${JSON.stringify(elementInfo.computedStyles, null, 2)}

【HTML片段】
\`\`\`html
${elementInfo.outerHTML}
\`\`\`

【操作指令格式】
请返回JSON格式的操作数组，支持的operation类型：

样式修改：
- {"operation": "setStyle", "property": "backgroundColor", "value": "red"}
- {"operation": "addClass", "className": "highlight"}
- {"operation": "removeClass", "className": "hidden"}

内容修改：
- {"operation": "setText", "text": "新的文本"}
- {"operation": "setAttribute", "name": "disabled", "value": "true"}
- {"operation": "removeAttribute", "name": "href"}

结构修改：
- {"operation": "removeChild", "selector": ".remove-me"}
- {"operation": "insertChild", "html": "<span>新内容</span>", "position": "append"}

重要限制：
1. 返回的value必须是字符串、数字或布尔值
2. insertChild的html必须简洁，避免复杂结构
3. 只返回必要的操作，不要过度修改
4. 如果请求不合理，返回 {"operation": "explain", "reason": "原因"}

【返回格式】
\`\`\`json
{
  "operations": [
    // 操作数组
  ]
}
\`\`\`
`;
  }

  /**
   * 调用OpenAI API
   *
   * @param prompt - 发送给AI的prompt
   * @returns API响应
   */
  private async callOpenAI(prompt: string): Promise<any> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const endpoint = `${baseUrl}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => {
        return {};
      });
      throw new Error(
        `OpenAI API错误: ${response.status} ${response.statusText} - ${
          errorData.error?.message || '未知错误'
        }`
      );
    }

    return response.json();
  }

  /**
   * 调用Claude API
   *
   * @param prompt - 发送给AI的prompt
   * @returns API响应
   */
  private async callClaude(prompt: string): Promise<any> {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
    const endpoint = `${baseUrl}/messages`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.modelName,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => {
        return {};
      });
      throw new Error(
        `Claude API错误: ${response.status} ${response.statusText} - ${
          errorData.error?.message || '未知错误'
        }`
      );
    }

    return response.json();
  }

  /**
   * 调用Z.ai API
   *
   * @param prompt - 发送给AI的prompt
   * @returns API响应
   */
  private async callZAI(prompt: string): Promise<any> {
    const baseUrl =
      this.config.serviceSite || 'https://api.z.ai/api/coding/paas/v4';
    const endpoint = `${baseUrl}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => {
        return {};
      });
      throw new Error(
        `Z.ai API错误: ${response.status} ${response.statusText} - ${
          errorData.error?.message || '未知错误'
        }`
      );
    }

    return response.json();
  }

  /**
   * 调用自定义API
   *
   * @param prompt - 发送给AI的prompt
   * @returns API响应
   */
  private async callCustom(prompt: string): Promise<any> {
    if (!this.config.baseUrl) {
      throw new Error('自定义API需要配置baseUrl');
    }

    const endpoint = `${this.config.baseUrl}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => {
        return {};
      });
      throw new Error(
        `自定义API错误: ${response.status} ${response.statusText} - ${
          errorData.error?.message || '未知错误'
        }`
      );
    }

    return response.json();
  }

  /**
   * 解析AI响应
   *
   * @param response - 原始API响应
   * @param provider - AI provider
   * @returns 解析后的操作数组
   */
  private parseResponse(response: any, provider: string): AIResponse {
    try {
      let content: string;

      // 根据不同provider提取content
      switch (provider) {
        case 'openai':
        case 'zai':
        case 'custom':
          content = response.choices?.[0]?.message?.content;
          break;
        case 'claude':
          content = response.content?.[0]?.text;
          break;
        default:
          throw new Error(`不支持的provider: ${provider}`);
      }

      if (!content) {
        throw new Error('AI响应中没有找到content');
      }

      // 提取JSON部分（处理可能的前后文本）
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;

      // 解析JSON
      const parsed = JSON.parse(jsonStr);

      // 验证格式
      if (!parsed.operations || !Array.isArray(parsed.operations)) {
        throw new Error('AI响应格式错误：缺少operations数组');
      }

      return {
        operations: parsed.operations,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[AIClient] 解析响应失败:', errorMessage);
      throw new Error(`解析AI响应失败: ${errorMessage}`);
    }
  }
}

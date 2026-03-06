/**
 * Extension Message Types
 *
 * 定义扩展中用于 Background 和 Content Script 之间通信的消息类型
 *
 * 通信架构：
 * ┌─────────────────────────────────────────────────────────────┐
 * │                                                              │
 * │   ┌──────────────┐    START_PICKER     ┌──────────────────┐ │
 * │   │              │ ──────────────────►  │                  │ │
 * │   │   Background │                       │   Content       │ │
 * │   │   Script     │                       │   Script        │ │
 * │   │              │ ◄──────────────────   │                  │ │
 * │   └──────────────┘                      └──────────────────┘ │
 * │                                                              │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 消息流程：
 * 1. 用户点击扩展图标
 * 2. Background 发送 START_PICKER 到 Content Script
 * 3. Content Script 启动元素选择器
 */

/**
 * 启动元素选择器消息
 */
export interface StartPickerMessage {
  type: 'START_PICKER';
}

/**
 * 停止元素选择器消息
 */
export interface StopPickerMessage {
  type: 'STOP_PICKER';
}

/**
 * 打开选项页消息
 */
export interface OpenOptionsMessage {
  type: 'OPEN_OPTIONS';
}

/**
 * 请求AI修改消息
 * 从Content Script发送到Background Script
 */
export interface RequestAIModificationMessage {
  type: 'REQUEST_AI_MODIFICATION';
  payload: {
    prompt: string;
    elementInfo: {
      tagName: string;
      id?: string;
      className?: string;
      outerHTML: string;
      textContent?: string;
      computedStyles: Record<string, string>;
    };
  };
}

/**
 * 应用操作消息
 * 从Background Script发送回Content Script
 */
export interface ApplyOperationsMessage {
  type: 'APPLY_OPERATIONS';
  payload: {
    operations: unknown[];
  };
}

/**
 * AI修改结果消息
 * 可选的结果反馈消息
 */
export interface AIModificationResultMessage {
  type: 'AI_MODIFICATION_RESULT';
  payload: {
    success: boolean;
    error?: string;
  };
}

/**
 * 扩展消息联合类型
 */
export type ExtensionMessage =
  | StartPickerMessage
  | StopPickerMessage
  | OpenOptionsMessage
  | RequestAIModificationMessage
  | ApplyOperationsMessage
  | AIModificationResultMessage;

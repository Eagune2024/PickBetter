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
 * 扩展消息联合类型
 */
export type ExtensionMessage = StartPickerMessage | StopPickerMessage;

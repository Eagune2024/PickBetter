/**
 * Content Script
 *
 * 注入到所有网页中，负责接收来自 Background 的消息并启动元素选择器
 *
 * 交互流程：
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      BACKGROUND SCRIPT                      │
 * │                              │                               │
 * │                              │ START_PICKER                  │
 * │                              ▼                               │
 * │                      CONTENT SCRIPT                         │
 * │                              │                               │
 * │                              ▼                               │
 * │                   启动元素选择器                             │
 * │                   (elementPicker.ts)                        │
 * └─────────────────────────────────────────────────────────────┘
 */

import browser from 'webextension-polyfill';
import type {ExtensionMessage} from '../types/messages';
import {startPicker, stopPicker} from './elementPicker';

/**
 * 监听来自 Background 的消息
 */
browser.runtime.onMessage.addListener((message: unknown): void => {
  const msg = message as ExtensionMessage;

  if (msg.type === 'START_PICKER') {
    console.log('[ContentScript] 启动元素选择器');
    startPicker();
  }

  if (msg.type === 'STOP_PICKER') {
    console.log('[ContentScript] 停止元素选择器');
    stopPicker();
  }
});

// Content Script 加载完成
console.log('[ContentScript] PickBetter 元素选择器已就绪');

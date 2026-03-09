/**
 * Background Script
 *
 * 职责：
 * 1. 监听扩展图标点击，启动元素选择器
 * 2. 处理来自 Content Script 的消息，包括打开选项页
 *
 * 交互流程：
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      用户点击扩展图标                         │
 * │                              │                               │
 * │                              ▼                               │
 * │              browser.action.onClicked 触发                   │
 * │                              │                               │
 * │                              ▼                               │
 * │              发送 START_PICKER 消息到 Content Script         │
 * │                              │                               │
 * │                              ▼                               │
 * │              Content Script 启动元素选择器                   │
 * │                                                              │
 * │  如果启动失败（Content Script 未注入），显示浏览器通知        │
 * └─────────────────────────────────────────────────────────────┘
 */

import browser from 'webextension-polyfill';
import type {ExtensionMessage} from '../types/messages';
import {AIClient} from '../utils/aiClient';
import {getStorage} from '../utils/storage';

/**
 * 显示浏览器通知
 */
async function showNotification(message: string): Promise<void> {
  try {
    await browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('assets/icons/favicon-48.png'),
      title: 'PickBetter',
      message,
    });
  } catch (error) {
    console.error('[Background] 显示通知失败:', error);
  }
}

/**
 * 处理扩展图标点击事件
 */
browser.action.onClicked.addListener(async (tab) => {
  console.log('[Background] 扩展图标被点击');

  if (!tab.id) {
    console.error('[Background] 无法获取标签页 ID');
    await showNotification('无法获取标签页信息');
    return;
  }

  try {
    // 发送启动选择器消息到 Content Script
    await browser.tabs.sendMessage(tab.id, {type: 'START_PICKER'});
    console.log('[Background] 已发送启动选择器消息');
  } catch (error) {
    console.error('[Background] 启动选择器失败:', error);
    await showNotification('启动失败，请刷新页面后重试');
  }
});

/**
 * 处理AI修改请求
 */
async function handleAIModification(
  message: ExtensionMessage,
  sender: browser.Runtime.MessageSender
): Promise<void> {
  if (message.type !== 'REQUEST_AI_MODIFICATION') {
    return;
  }

  console.log('[Background] 收到AI修改请求');

  // 获取tab ID
  const tabId = sender.tab?.id;
  if (!tabId) {
    console.error('[Background] 无法获取标签页 ID');
    return;
  }

  try {
    // 获取AI配置
    const storage = await getStorage(['aiModel']);
    const aiModel = storage.aiModel;

    if (!aiModel || !aiModel.apiKey) {
      console.error('[Background] AI模型未配置');
      await browser.tabs.sendMessage(tabId, {
        type: 'APPLY_OPERATIONS',
        payload: {
          error: 'AI模型未配置，请在设置页面配置',
        },
      });
      return;
    }

    // 创建AI客户端并请求修改
    const client = new AIClient(aiModel);
    const response = await client.requestModification(message.payload);

    console.log('[Background] AI响应:', response);

    // 发送操作回Content Script
    await browser.tabs.sendMessage(tabId, {
      type: 'APPLY_OPERATIONS',
      payload: {
        operations: response.operations,
      },
    });

    console.log('[Background] 已发送操作指令到Content Script');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('[Background] 处理AI请求失败:', errorMessage);

    // 发送错误回Content Script
    await browser.tabs.sendMessage(tabId, {
      type: 'APPLY_OPERATIONS',
      payload: {
        error: errorMessage,
      },
    });
  }
}

/**
 * 监听来自 Content Script 的消息
 */
browser.runtime.onMessage.addListener(
  (message: unknown, sender: browser.Runtime.MessageSender) => {
    const msg = message as ExtensionMessage;

    if (msg.type === 'OPEN_OPTIONS') {
      console.log('[Background] 收到打开选项页请求');
      // 打开选项页
      if (browser.runtime?.openOptionsPage) {
        browser.runtime.openOptionsPage().catch((error) => {
          console.error('[Background] 打开选项页失败:', error);
        });
      }
    } else if (msg.type === 'REQUEST_AI_MODIFICATION') {
      // 处理AI修改请求（异步）
      handleAIModification(msg, sender).catch((error) => {
        console.error('[Background] 处理AI修改请求失败:', error);
      });
    }
    // 返回 true 表示异步响应
    return true;
  }
);

// 扩展安装/更新时的日志
browser.runtime.onInstalled.addListener((): void => {
  console.log('[Background] PickBetter 扩展已加载');
  console.log('[Background] 点击扩展图标启动元素选择器');
});

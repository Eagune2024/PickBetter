/**
 * Element Picker Module
 *
 * Provides a visual element selection capability for the browser extension.
 * Users can activate picker mode, hover over elements to highlight them,
 * and click to select elements (displays AI dialog for prompt input).
 *
 * Usage:
 *   import {startPicker, stopPicker} from './elementPicker';
 *   startPicker();  // Activate picker mode
 *   stopPicker();   // Deactivate picker mode
 */

import browser from 'webextension-polyfill';
import type {ElementInfo} from '../types/operations';
import {OperationExecutor} from '../utils/operationExecutor';
import {ElementInfoExtractor} from './elementPicker/elementInfoExtractor';
import {AiDialogManager} from './elementPicker/aiDialogManager';
import {OverlayManager, type PickerState} from './elementPicker/overlayManager';
import {createPageSaver} from '../utils/pageSaver';

/**
 * ElementPicker Class
 *
 * 管理元素选择功能，协调各个模块：
 * - OverlayManager: 覆盖层和高亮
 * - AiDialogManager: AI 对话框和进度显示
 * - ElementInfoExtractor: 元素信息提取
 */
class ElementPicker {
  private state: PickerState = 'IDLE';
  private currentElement: HTMLElement | null = null;
  private selectedElement: HTMLElement | null = null;
  private isSubmitting = false;

  private overlayManager: OverlayManager;
  private aiDialogManager: AiDialogManager;
  private infoExtractor: ElementInfoExtractor;

  private readonly handleMouseOver: (e: MouseEvent) => void;
  private readonly handleClick: (e: MouseEvent) => void;
  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleWheel: (e: WheelEvent) => void;
  private readonly handleTouchMove: (e: TouchEvent) => void;

  constructor() {
    this.overlayManager = new OverlayManager();
    this.aiDialogManager = new AiDialogManager(null);
    this.infoExtractor = new ElementInfoExtractor();

    this.handleMouseOver = this.handleMouseOverImpl.bind(this);
    this.handleClick = this.handleClickImpl.bind(this);
    this.handleKeyDown = this.handleKeyDownImpl.bind(this);
    this.handleWheel = this.handleWheelImpl.bind(this);
    this.handleTouchMove = this.handleTouchMoveImpl.bind(this);
  }

  /**
   * 启动元素选择模式
   */
  public start(): void {
    if (this.state === 'PICKING' || this.state === 'SELECTED') {
      console.log('[ElementPicker] 选择模式已激活,无需重复启动');
      return;
    }

    this.state = 'PICKING';
    this.overlayManager.createOverlay();
    this.aiDialogManager.overlayContainer =
      this.overlayManager.overlayContainer;
    this.attachEventListeners();
    console.log('[ElementPicker] 选择模式已启动,按ESC退出');
  }

  /**
   * 停止元素选择模式
   */
  public stop(): void {
    if (this.state === 'IDLE') {
      return;
    }

    this.cleanup();
    this.state = 'IDLE';
    console.log('[ElementPicker] 选择模式已退出');
  }

  /**
   * 附加事件监听器
   */
  private attachEventListeners(): void {
    document.addEventListener('mouseover', this.handleMouseOver, {
      capture: true,
    });
    document.addEventListener('click', this.handleClick, {capture: true});
    document.addEventListener('keydown', this.handleKeyDown, {
      capture: true,
    });
    document.addEventListener('wheel', this.handleWheel, {passive: false});
    document.addEventListener('touchmove', this.handleTouchMove, {
      passive: false,
    });
  }

  /**
   * 分离事件监听器
   */
  private detachEventListeners(): void {
    document.removeEventListener('mouseover', this.handleMouseOver, {
      capture: true,
    });
    document.removeEventListener('click', this.handleClick, {
      capture: true,
    });
    document.removeEventListener('keydown', this.handleKeyDown, {
      capture: true,
    });
    document.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('touchmove', this.handleTouchMove);
  }

  /**
   * 处理鼠标悬停事件
   */
  private handleMouseOverImpl(e: MouseEvent): void {
    if (this.state !== 'PICKING') return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;

    if (this.currentElement === target) return;

    if (target.closest('.picker-ai-dialog')) return;

    this.currentElement = target;
    this.overlayManager.updateOverlay(target);
  }

  /**
   * 处理点击事件
   */
  private handleClickImpl(e: MouseEvent): void {
    if (this.state !== 'PICKING') return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = e.target as HTMLElement;

    if (target.closest('.picker-ai-dialog')) return;

    const rect = target.getBoundingClientRect();
    const elementInfo = {
      tagName: target.tagName,
      id: target.id || undefined,
      className: target.className || undefined,
      dimensions: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      textContent: target.textContent?.slice(0, 50) || undefined,
    };

    console.log('[ElementPicker] 选中元素:', elementInfo);

    this.state = 'SELECTED';
    this.showAiDialog(target);
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDownImpl(e: KeyboardEvent): void {
    if (this.state === 'PICKING' || this.state === 'SELECTED') {
      const scrollKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
      ];

      if (scrollKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    if (this.state === 'PICKING' && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.stop();
      return;
    }

    if (this.state === 'SELECTED') {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancelAiDialog();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.submitAiPrompt();
        return;
      }
    }
  }

  /**
   * 处理滚轮事件
   */
  private handleWheelImpl(e: WheelEvent): void {
    if (this.state === 'PICKING' || this.state === 'SELECTED') {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * 处理触摸移动事件
   */
  private handleTouchMoveImpl(e: TouchEvent): void {
    if (this.state === 'PICKING' || this.state === 'SELECTED') {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * 显示 AI 对话框
   */
  private showAiDialog(target: HTMLElement): void {
    this.aiDialogManager.setCancelCallback(() => this.cancelAiDialog());
    this.aiDialogManager.setContinueCallback(() => {
      this.state = 'PICKING';
    });
    this.aiDialogManager.setSavePageCallback(() => this.handleSavePage());

    const rect = target.getBoundingClientRect();
    const pos = this.overlayManager.calculateDialogPosition(rect);

    this.overlayManager.hideOverlay();
    this.aiDialogManager.showAiDialog(pos.x, pos.y);

    this.selectedElement = target;
    this.state = 'SELECTED';
  }

  /**
   * 处理保存页面
   */
  private async handleSavePage(): Promise<void> {
    const pageSaver = createPageSaver();

    this.aiDialogManager.updateSaveButtonState('saving');

    try {
      const result = await pageSaver.savePage((progress) => {
        this.aiDialogManager.showSavingProgress(
          progress.message || '',
          progress.percentage
        );
      });

      if (result.success) {
        this.aiDialogManager.showSaveSuccess(result.fileSize || '未知');
      } else {
        this.aiDialogManager.showSaveError(result.error || '保存失败');
        this.aiDialogManager.updateSaveButtonState('failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存失败';
      this.aiDialogManager.showSaveError(errorMessage);
      this.aiDialogManager.updateSaveButtonState('failed');
    }
  }

  /**
   * 取消 AI 对话框
   */
  private cancelAiDialog(): void {
    this.aiDialogManager.hideAiDialog();
    this.state = 'PICKING';
  }

  /**
   * 提交 AI 提示词
   *
   * 使用微任务调度机制确保浏览器有机会更新 UI:
   * - await Promise.resolve() 创建微任务,让浏览器在下一个事件循环前更新 DOM
   * - 在每个操作前后插入微任务,确保用户看到进度变化
   * - 开销 <5ms,用户体验提升明显
   *
   * 步骤状态流转:
   * - pending → running → completed
   * -              ↓
   * -            failed
   */
  private async submitAiPrompt(): Promise<void> {
    const prompt = this.aiDialogManager.dialogInput?.value || '';

    if (!prompt.trim()) {
      return;
    }

    // 防止重复提交
    if (this.isSubmitting) {
      console.warn('[ElementPicker] 正在提交中，忽略重复请求');
      return;
    }

    this.isSubmitting = true;

    console.log('[ElementPicker] AI Prompt:', prompt);

    // 根据指令类型生成步骤列表
    const needsDeepAnalysis = this.infoExtractor.isFuzzyPrompt(prompt);
    console.log('[ElementPicker] 是否需要深度分析:', needsDeepAnalysis);

    const steps = this.aiDialogManager.generateSteps(needsDeepAnalysis);

    // 立即显示步骤列表(<5ms)
    this.aiDialogManager.showProgressSteps(steps);

    // 微任务:让浏览器有机会渲染 UI
    await Promise.resolve();

    if (!steps[0]) return;
    steps[0].status = 'running';
    this.aiDialogManager.updateProgressSteps(steps);

    await Promise.resolve();

    let elementInfo: ElementInfo;
    try {
      elementInfo = this.infoExtractor.extractElementInfo(
        this.selectedElement,
        {
          includeParent: needsDeepAnalysis,
          includeSiblings: needsDeepAnalysis,
          includeDesignSystem: needsDeepAnalysis,
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '提取元素信息失败';
      this.aiDialogManager.showErrorInSteps(errorMessage);
      this.isSubmitting = false;
      return;
    }

    steps[0].status = 'completed';
    this.aiDialogManager.updateProgressSteps(steps);

    if (needsDeepAnalysis) {
      if (!steps[1]) return;
      steps[1].status = 'running';
      this.aiDialogManager.updateProgressSteps(steps);
      await Promise.resolve();

      try {
        // 父元素信息已在 extractElementInfo 中提取
      } catch {
        steps[1]!.status = 'failed';
        this.aiDialogManager.updateProgressSteps(steps);
        this.isSubmitting = false;
        return;
      }

      steps[1].status = 'completed';
      this.aiDialogManager.updateProgressSteps(steps);

      if (!steps[2]) return;
      steps[2].status = 'running';
      this.aiDialogManager.updateProgressSteps(steps);
      await Promise.resolve();

      try {
        // 兄弟元素信息已在 extractElementInfo 中提取
      } catch {
        steps[2]!.status = 'failed';
        this.aiDialogManager.updateProgressSteps(steps);
        this.isSubmitting = false;
        return;
      }

      steps[2].status = 'completed';
      this.aiDialogManager.updateProgressSteps(steps);

      if (!steps[3]) return;
      steps[3].status = 'running';
      this.aiDialogManager.updateProgressSteps(steps);
      await Promise.resolve();

      steps[3].status = 'completed';
      this.aiDialogManager.updateProgressSteps(steps);

      const aiStepIndex = 4;

      if (!steps[aiStepIndex]) return;
      steps[aiStepIndex].status = 'running';
      this.aiDialogManager.updateProgressSteps(steps);
      await Promise.resolve();

      try {
        await browser.runtime.sendMessage({
          type: 'REQUEST_AI_MODIFICATION',
          payload: {
            prompt,
            elementInfo,
          },
        });

        console.log('[ElementPicker] 已发送AI请求到Background');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '发送请求失败';
        steps[aiStepIndex]!.status = 'failed';
        this.aiDialogManager.updateProgressSteps(steps);
        this.aiDialogManager.showErrorInSteps(errorMessage);
        this.isSubmitting = false;
        return;
      }
    } else {
      const aiStepIndex = 1;

      if (!steps[aiStepIndex]) return;
      steps[aiStepIndex].status = 'running';
      this.aiDialogManager.updateProgressSteps(steps);
      await Promise.resolve();

      try {
        await browser.runtime.sendMessage({
          type: 'REQUEST_AI_MODIFICATION',
          payload: {
            prompt,
            elementInfo,
          },
        });

        console.log('[ElementPicker] 已发送AI请求到Background');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '发送请求失败';
        steps[aiStepIndex]!.status = 'failed';
        this.aiDialogManager.updateProgressSteps(steps);
        this.aiDialogManager.showErrorInSteps(errorMessage);
        this.isSubmitting = false;
        return;
      }
    }
  }

  /**
   * 处理应用操作消息
   */
  private async handleApplyOperations(operations: unknown[]): Promise<void> {
    if (!this.selectedElement) {
      console.error('[ElementPicker] 没有选中的元素');
      this.aiDialogManager.showError('元素不存在');
      this.isSubmitting = false;
      return;
    }

    // 任务 5.1: 收到 APPLY_OPERATIONS 消息时更新步骤状态
    // 更新"AI 正在思考..."步骤为完成
    const steps = this.aiDialogManager.getProgressSteps();
    const aiStep = steps.find((s) => s.id === 'ai');
    if (aiStep && aiStep.status === 'running') {
      aiStep.status = 'completed';
    }

    // 更新"应用修改"步骤为进行中
    const applyStep = steps.find((s) => s.id === 'apply');
    if (applyStep) {
      applyStep.status = 'running';
    }
    this.aiDialogManager.updateProgressSteps(steps);

    try {
      const executor = new OperationExecutor();
      const result = await executor.execute(this.selectedElement, operations);

      console.log('[ElementPicker] 操作执行结果:', result);

      // 任务 5.2: 处理操作执行结果
      if (result.failedOperations.length === 0) {
        // 所有操作成功,完成"应用修改"步骤
        if (applyStep) {
          applyStep.status = 'completed';
          this.aiDialogManager.updateProgressSteps(steps);
        }
        this.aiDialogManager.showSuccess();
      } else if (result.successfulOperations.length === 0) {
        // 所有操作失败
        const error = result.failedOperations[0]?.error || '操作执行失败';
        // 任务 5.3: 处理错误情况
        if (applyStep) {
          applyStep.status = 'failed';
          this.aiDialogManager.updateProgressSteps(steps);
        }
        this.aiDialogManager.showError(error);
      } else {
        // 部分操作成功
        const failedCount = result.failedOperations.length;
        if (applyStep) {
          applyStep.status = 'completed';
          this.aiDialogManager.updateProgressSteps(steps);
        }
        this.aiDialogManager.showSuccess();
        console.warn(`[ElementPicker] ${failedCount} 个操作失败，已跳过`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[ElementPicker] 执行操作失败:', errorMessage);
      // 任务 5.3: 处理错误情况
      if (applyStep) {
        applyStep.status = 'failed';
        this.aiDialogManager.updateProgressSteps(steps);
      }
      this.aiDialogManager.showError(errorMessage);
    }

    this.isSubmitting = false;
  }

  /**
   * 清理所有副作用
   */
  private cleanup(): void {
    this.detachEventListeners();
    this.aiDialogManager.hideAiDialog();
    this.overlayManager.removeOverlay();
    this.currentElement = null;
  }

  /**
   * 暴露内部方法供消息监听器调用
   */
  public _handleApplyOperations(operations: unknown[]): Promise<void> {
    return this.handleApplyOperations(operations);
  }

  public _resetSubmitting(): void {
    this.isSubmitting = false;
  }

  public _showError(error: string): void {
    this.aiDialogManager.showError(error);
  }
}

// ==================== Global Instance ====================

let pickerInstance: ElementPicker | null = null;

/**
 * 启动元素选择模式
 */
export const startPicker = (): void => {
  if (!pickerInstance) {
    pickerInstance = new ElementPicker();
  }
  pickerInstance.start();
};

/**
 * 停止元素选择模式
 */
export const stopPicker = (): void => {
  if (pickerInstance) {
    pickerInstance.stop();
  }
};

// ==================== 消息监听器 ====================

browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as {
    type: string;
    payload: {operations?: unknown[]; error?: string};
  };

  if (msg.type === 'APPLY_OPERATIONS') {
    console.log('[ElementPicker] 收到操作指令');

    if (msg.payload.error) {
      if (pickerInstance) {
        pickerInstance._showError(msg.payload.error);
        pickerInstance._resetSubmitting();
      }
    } else if (msg.payload.operations) {
      if (pickerInstance) {
        pickerInstance._handleApplyOperations(msg.payload.operations);
      }
    }
  }

  return false;
});

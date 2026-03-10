/**
 * 进度步骤状态
 */
type ProgressStepStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * 进度步骤
 */
interface ProgressStep {
  id: string;
  label: string;
  status: ProgressStepStatus;
}

/**
 * AI 对话框管理器
 * 负责 AI 对话框、进度显示和状态反馈
 */
export class AiDialogManager {
  public aiDialog: HTMLElement | null = null;
  public dialogInput: HTMLInputElement | null = null;
  public overlayContainer: HTMLElement | null = null;
  private progressSteps: ProgressStep[] = [];
  private onCancel?: () => void;
  private onContinue?: () => void;
  private onSavePage?: () => void;

  constructor(overlayContainer: HTMLElement | null) {
    this.overlayContainer = overlayContainer;
  }

  setCancelCallback(callback: () => void): void {
    this.onCancel = callback;
  }

  setContinueCallback(callback: () => void): void {
    this.onContinue = callback;
  }

  setSavePageCallback(callback: () => void): void {
    this.onSavePage = callback;
  }

  /**
   * 创建 AI 对话框 DOM 元素
   */
  createAiDialog(): void {
    this.aiDialog = document.createElement('div');
    this.aiDialog.className = 'picker-ai-dialog';
    this.aiDialog.style.cssText = `
      position: absolute;
      pointer-events: auto;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 2147483642;
      min-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: none;
    `;

    const title = document.createElement('div');
    title.textContent = '如何调整此元素?';
    title.style.cssText = `
      font-size: 14px;
      margin-bottom: 8px;
      color: #d4d4d4;
      font-weight: 500;
    `;

    this.dialogInput = document.createElement('input');
    this.dialogInput.type = 'text';
    this.dialogInput.placeholder = '描述你想要的调整（如：把按钮改成红色）';
    this.dialogInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #3e3e3e;
      border-radius: 4px;
      background: #2d2d2d;
      color: #d4d4d4;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
    `;

    this.dialogInput.addEventListener('focus', () => {
      if (this.dialogInput) {
        this.dialogInput.style.borderColor = '#2196F3';
      }
    });

    this.dialogInput.addEventListener('blur', () => {
      if (this.dialogInput) {
        this.dialogInput.style.borderColor = '#3e3e3e';
      }
    });

    const hint = document.createElement('div');
    hint.textContent = '按 Enter 提交，ESC 取消';
    hint.style.cssText = `
      font-size: 12px;
      color: #888;
      margin-top: 6px;
    `;

    this.aiDialog.appendChild(title);
    this.aiDialog.appendChild(this.dialogInput);
    this.aiDialog.appendChild(hint);

    this.overlayContainer?.appendChild(this.aiDialog);
  }

  /**
   * 显示 AI 对话框
   */
  showAiDialog(x: number, y: number): void {
    if (!this.aiDialog) {
      this.createAiDialog();
    }

    if (this.aiDialog) {
      this.aiDialog.style.display = 'block';
      this.aiDialog.style.left = `${x}px`;
      this.aiDialog.style.top = `${y}px`;
    }

    this.dialogInput?.focus();
  }

  /**
   * 隐藏 AI 对话框
   */
  hideAiDialog(): void {
    if (this.aiDialog) {
      this.aiDialog.remove();
      this.aiDialog = null;
    }

    this.dialogInput = null;
  }

  /**
   * 生成进度步骤列表
   */
  generateSteps(needsDeepAnalysis: boolean): ProgressStep[] {
    if (needsDeepAnalysis) {
      return [
        {id: 'extract', label: '提取元素信息', status: 'pending'},
        {id: 'parent', label: '提取父元素信息', status: 'pending'},
        {id: 'siblings', label: '分析兄弟元素', status: 'pending'},
        {id: 'layout', label: '分析页面布局', status: 'pending'},
        {id: 'ai', label: 'AI 正在思考...', status: 'pending'},
        {id: 'apply', label: '应用修改', status: 'pending'},
      ];
    } else {
      return [
        {id: 'extract', label: '提取元素信息', status: 'pending'},
        {id: 'ai', label: 'AI 正在思考...', status: 'pending'},
        {id: 'apply', label: '应用修改', status: 'pending'},
      ];
    }
  }

  /**
   * 获取步骤图标
   */
  private getStepIcon(status: ProgressStepStatus): string {
    switch (status) {
      case 'pending':
        return '○';
      case 'running':
        return '⏳';
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      default:
        return '○';
    }
  }

  /**
   * 显示进度步骤列表
   */
  showProgressSteps(steps: ProgressStep[]): void {
    if (!this.aiDialog) return;

    this.progressSteps = steps;

    this.aiDialog.innerHTML = `
      <div class='progress-container'>
        ${steps
          .map(
            (step) => `
          <div class='progress-step ${step.status}' data-step='${step.id}'>
            <span class='step-icon'>${this.getStepIcon(step.status)}</span>
            <span class='step-label'>${step.label}</span>
          </div>
        `
          )
          .join('')}
      </div>
      <style>
        .progress-container {
          padding: 16px;
          min-width: 300px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .progress-step {
          display: flex;
          align-items: center;
          padding: 8px 0;
          font-size: 14px;
          line-height: 1.4;
          transition: all 0.3s ease;
        }
        .progress-step.completed {
          color: #4caf50;
          opacity: 0.7;
        }
        .progress-step.running {
          color: #2196F3;
          font-weight: 500;
        }
        .progress-step.pending {
          color: #888;
        }
        .progress-step.failed {
          color: #f44336;
        }
        .step-icon {
          margin-right: 12px;
          width: 20px;
          text-align: center;
        }
        .progress-step.running .step-icon {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      </style>
    `;
  }

  /**
   * 更新进度步骤状态
   */
  updateProgressSteps(steps: ProgressStep[]): void {
    if (!this.aiDialog) return;

    this.progressSteps = steps;

    steps.forEach((step) => {
      const stepEl = this.aiDialog!.querySelector(
        `[data-step='${step.id}']`
      ) as HTMLElement;
      if (stepEl) {
        const iconEl = stepEl.querySelector('.step-icon');
        if (iconEl) {
          iconEl.textContent = this.getStepIcon(step.status);
        }

        stepEl.classList.remove('pending', 'running', 'completed', 'failed');
        stepEl.classList.add(step.status);
      }
    });
  }

  /**
   * 在步骤中显示错误
   */
  showErrorInSteps(message: string): void {
    if (!this.aiDialog) return;

    const runningStep = this.progressSteps.find((s) => s.status === 'running');
    if (runningStep) {
      runningStep.status = 'failed';
      this.updateProgressSteps(this.progressSteps);
    }

    this.aiDialog.innerHTML = `
      <div style='
        padding: 16px;
        min-width: 280px;
      '>
        <div style='
          font-size: 16px;
          color: #f44336;
          margin-bottom: 8px;
          font-weight: 500;
        '>❌ 处理失败</div>
        <div style='
          font-size: 13px;
          color: #d4d4d4;
          margin-bottom: 16px;
          line-height: 1.5;
        '>${this.escapeHtml(message)}</div>
        <button id='closeErrorBtn' style='
          width: 100%;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          background: #3e3e3e;
          color: #d4d4d4;
          font-size: 14px;
          cursor: pointer;
        '>关闭</button>
      </div>
    `;

    const closeBtn = this.aiDialog.querySelector('#closeErrorBtn');
    closeBtn?.addEventListener('click', () => {
      this.onCancel?.();
    });
  }

  /**
   * 显示成功状态
   */
  showSuccess(): void {
    if (!this.aiDialog) return;

    this.aiDialog.innerHTML = `
      <div style='
        padding: 16px;
        min-width: 280px;
      '>
        <div style='
          font-size: 16px;
          color: #4caf50;
          margin-bottom: 8px;
          font-weight: 500;
        '>✓ 修改成功</div>
        <div style='
          font-size: 13px;
          color: #d4d4d4;
          margin-bottom: 16px;
        '>元素已按照您的要求修改</div>
        <div style='
          display: flex;
          gap: 8px;
        '>
          <button id='savePageBtn' style='
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            background: #4caf50;
            color: white;
            font-size: 14px;
            cursor: pointer;
          '>保存页面</button>
          <button id='closeSuccessBtn' style='
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            background: #2196F3;
            color: white;
            font-size: 14px;
            cursor: pointer;
          '>继续选择</button>
        </div>
      </div>
    `;

    const saveBtn = this.aiDialog.querySelector(
      '#savePageBtn'
    ) as HTMLButtonElement;
    const closeBtn = this.aiDialog.querySelector('#closeSuccessBtn');

    saveBtn?.addEventListener('click', () => {
      this.onSavePage?.();
    });

    closeBtn?.addEventListener('click', () => {
      this.hideAiDialog();
      this.onContinue?.();
    });
  }

  /**
   * 显示错误状态
   */
  showError(error: string): void {
    if (!this.aiDialog) return;

    this.aiDialog.innerHTML = `
      <div style='
        padding: 16px;
        min-width: 280px;
      '>
        <div style='
          font-size: 16px;
          color: #f44336;
          margin-bottom: 8px;
          font-weight: 500;
        '>❌ 修改失败</div>
        <div style='
          font-size: 13px;
          color: #d4d4d4;
          margin-bottom: 16px;
          line-height: 1.5;
        '>${this.escapeHtml(error)}</div>
        <button id='closeErrorBtn' style='
          width: 100%;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          background: #3e3e3e;
          color: #d4d4d4;
          font-size: 14px;
          cursor: pointer;
        '>关闭</button>
      </div>
    `;

    const closeBtn = this.aiDialog.querySelector('#closeErrorBtn');
    closeBtn?.addEventListener('click', () => {
      this.onCancel?.();
    });
  }

  /**
   * 转义 HTML 防止 XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 显示保存进度
   */
  showSavingProgress(message: string, percentage: number): void {
    if (!this.aiDialog) return;

    this.aiDialog.innerHTML = `
      <div style='
        padding: 16px;
        min-width: 280px;
      '>
        <div style='
          font-size: 16px;
          color: #2196F3;
          margin-bottom: 12px;
          font-weight: 500;
        '>⏳ 正在保存页面...</div>
        <div style='
          font-size: 13px;
          color: #d4d4d4;
          margin-bottom: 16px;
        '>${this.escapeHtml(message)}</div>
        <div style='
          width: 100%;
          height: 4px;
          background: #3e3e3e;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        '>
          <div style='
            width: ${percentage}%;
            height: 100%;
            background: #2196F3;
            transition: width 0.3s ease;
          '></div>
        </div>
        <div style='
          font-size: 12px;
          color: #888;
          text-align: center;
        '>${percentage}%</div>
      </div>
    `;
  }

  /**
   * 显示保存成功状态
   */
  showSaveSuccess(fileSize: string): void {
    if (!this.aiDialog) return;

    this.aiDialog.innerHTML = `
      <div style='
        padding: 16px;
        min-width: 280px;
      '>
        <div style='
          font-size: 16px;
          color: #4caf50;
          margin-bottom: 8px;
          font-weight: 500;
        '>✓ 保存成功</div>
        <div style='
          font-size: 13px;
          color: #d4d4d4;
          margin-bottom: 16px;
        '>页面已保存,文件大小: ${this.escapeHtml(fileSize)}</div>
        <button id='closeSaveSuccessBtn' style='
          width: 100%;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          background: #2196F3;
          color: white;
          font-size: 14px;
          cursor: pointer;
        '>关闭</button>
      </div>
    `;

    const closeBtn = this.aiDialog.querySelector('#closeSaveSuccessBtn');
    closeBtn?.addEventListener('click', () => {
      this.hideAiDialog();
    });
  }

  /**
   * 显示保存失败状态
   */
  showSaveError(error: string): void {
    if (!this.aiDialog) return;

    this.aiDialog.innerHTML = `
      <div style='
        padding: 16px;
        min-width: 280px;
      '>
        <div style='
          font-size: 16px;
          color: #f44336;
          margin-bottom: 8px;
          font-weight: 500;
        '>❌ 保存失败</div>
        <div style='
          font-size: 13px;
          color: #d4d4d4;
          margin-bottom: 16px;
          line-height: 1.5;
        '>${this.escapeHtml(error)}</div>
        <button id='closeSaveErrorBtn' style='
          width: 100%;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          background: #3e3e3e;
          color: #d4d4d4;
          font-size: 14px;
          cursor: pointer;
        '>关闭</button>
      </div>
    `;

    const closeBtn = this.aiDialog.querySelector('#closeSaveErrorBtn');
    closeBtn?.addEventListener('click', () => {
      this.hideAiDialog();
    });
  }

  /**
   * 更新保存按钮状态
   */
  updateSaveButtonState(state: 'idle' | 'saving' | 'saved' | 'failed'): void {
    const saveBtn = this.aiDialog?.querySelector(
      '#savePageBtn'
    ) as HTMLButtonElement;
    if (!saveBtn) return;

    switch (state) {
      case 'idle':
        saveBtn.disabled = false;
        saveBtn.textContent = '保存页面';
        saveBtn.style.background = '#4caf50';
        break;
      case 'saving':
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';
        saveBtn.style.background = '#888';
        break;
      case 'saved':
        saveBtn.disabled = true;
        saveBtn.textContent = '已保存';
        saveBtn.style.background = '#4caf50';
        break;
      case 'failed':
        saveBtn.disabled = false;
        saveBtn.textContent = '保存失败';
        saveBtn.style.background = '#f44336';
        break;
    }
  }
}

# OpenSpec 规范同步摘要

## 同步时间
2026-03-05

## 变更 ID
ai-dialog-prompt

## 同步内容

### 1. 新增 Capability: picker-ai-dialog
**位置**: `/Users/eagune/Documents/PickBetter/openspec/specs/picker-ai-dialog/spec.md`

**Requirements 总数**: 7 个主要需求
- 对话框显示
- 对话框定位
- 对话框交互
- 对话框样式
- 事件隔离
- 状态管理
- 覆盖层管理

**文件行数**: 129 行

**关键特性**:
- 智能定位算法 (右侧 → 左侧 → 内部)
- 深色主题样式 (#1e1e1e 背景)
- z-index 层级管理 (2147483642)
- 完整的事件隔离机制

---

### 2. 新增 Capability: element-picker
**位置**: `/Users/eagune/Documents/PickBetter/openspec/specs/element-picker/spec.md`

**Requirements 总数**: 5 个主要需求
- 状态管理 (三状态机)
- 鼠标事件处理
- 键盘事件处理
- 覆盖层管理
- 元素信息输出

**文件行数**: 143 行

**关键特性**:
- 三状态机: IDLE → PICKING → SELECTED
- 根据状态过滤鼠标事件
- SELECTED 状态下隔离对话框交互
- prompt 提交到控制台

---

## 同步验证

✅ **文件完整性**: 所有文件已成功复制到主规范目录
✅ **内容一致性**: diff 验证通过，无差异
✅ **目录结构**: 符合 OpenSpec 规范结构
✅ **文档更新**: exploration-summary.md 已更新

---

## 影响范围

### 新增功能
1. AI 对话框 UI 组件
2. 元素选择器状态机升级
3. 智能定位算法
4. prompt 输入和提交机制

### 修改功能
1. 元素选择器从两状态 (激活/非激活) 升级为三状态机
2. 鼠标事件处理逻辑增强，支持状态过滤
3. 键盘事件处理扩展，支持 SELECTED 状态

---

## 后续工作建议

1. **Design 文档**: 创建 UI/UX 设计文档
2. **Tasks 文档**: 将需求拆分为开发任务
3. **代码实现**: 按照 spec 实现功能
4. **测试用例**: 根据 Scenario 编写测试

---

## 文件路径参考

| 类型 | 路径 |
|------|------|
| 变更源目录 | `openspec/changes/ai-dialog-prompt/specs/` |
| 主规范目录 | `openspec/specs/` |
| picker-ai-dialog | `openspec/specs/picker-ai-dialog/spec.md` |
| element-picker | `openspec/specs/element-picker/spec.md` |
| 探索总结 | `openspec/specs/_meta/exploration-summary.md` |

---

## 同步命令参考

```bash
# 创建 capability 目录
mkdir -p openspec/specs/picker-ai-dialog
mkdir -p openspec/specs/element-picker

# 复制规范文件
cp openspec/changes/ai-dialog-prompt/specs/picker-ai-dialog/spec.md \
   openspec/specs/picker-ai-dialog/spec.md

cp openspec/changes/ai-dialog-prompt/specs/element-picker/spec.md \
   openspec/specs/element-picker/spec.md

# 验证一致性
diff openspec/changes/ai-dialog-prompt/specs/picker-ai-dialog/spec.md \
     openspec/specs/picker-ai-dialog/spec.md

diff openspec/changes/ai-dialog-prompt/specs/element-picker/spec.md \
     openspec/specs/element-picker/spec.md
```

---

**同步状态**: ✅ 完成
**验证状态**: ✅ 通过

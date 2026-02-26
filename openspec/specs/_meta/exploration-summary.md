# 项目探索总结

## 探索时间
2025-02-26

## 探索目标
深入了解 PickBetter 浏览器扩展项目的架构、编码规范和开发模式,为后续开发提供知识基础。

## 探索成果

### 创建的文档

本次探索创建了以下 OpenSpec 文档,记录了项目的核心知识:

#### 1. 架构规格文档
📄 `openspec/specs/architecture/spec.md`

**内容概述**:
- 项目技术栈 (React 19, TypeScript 5.9, Vite 7, SCSS + CSS Modules)
- 整体架构图 (Background ↔ Content Script ↔ Popup)
- 核心模块职责详解
  - Background Script (中央消息路由)
  - Content Script (页面DOM操作,必须打包为IIFE)
  - Popup (用户交互界面)
  - Options (设置页面)
  - Storage (持久化存储)
- 消息通信架构和流程
- 跨浏览器兼容性方案 (Manifest V3)
- 构建系统配置和输出结构
- 开发工作流
- 目录结构详解
- 调试技巧
- 安全考虑
- 性能优化建议
- 已知限制

**关键洞察**:
- Content Script 必须打包为 IIFE,不支持 ES Module
- 消息通信使用类型安全的 TypeScript 联合类型
- 使用 vendor 前缀实现跨浏览器配置

---

#### 2. 编码规范文档
📄 `openspec/specs/coding-standards/spec.md`

**内容概述**:
- 项目配置 (EditorConfig, TypeScript, ESLint)
- TypeScript 规范
  - interface vs type 使用场景
  - FC 类型显式声明
  - 函数返回类型标注
  - 类型守卫与断言
  - 泛型使用
- React 规范
  - 组件定义模式
  - Props 解构
  - Hooks 使用规范
  - 事件处理
  - 条件渲染
  - 列表渲染
- 导入顺序规范
- SCSS/CSS 规范
  - CSS Modules 强制要求
  - SCSS 导入顺序
  - 命名规范 (camelCase)
  - 使用变量
- 浏览器扩展特定规范
  - 类型安全的消息通信
  - 存储操作模式
  - 异步操作最佳实践
- 代码组织规范
- 注释规范
- 性能最佳实践
- 错误处理模式
- 代码审查清单

**关键规范**:
- 所有组件使用 FC 类型
- 样式必须使用 CSS Modules
- 导入顺序: React → 第三方库 → 内部模块 → 类型 → 样式
- 存储操作必须使用类型安全的工具函数

---

#### 3. 快速参考指南
📄 `openspec/specs/quick-reference/spec.md`

**内容概述**:
- 快速开始 (开发模式、构建、代码检查)
- 常用模式
  - 创建新组件
  - 添加新消息类型
  - 添加存储字段
  - 创建新页面
- 常见任务
  - 修改扩展图标
  - 添加权限
  - 跨域请求
  - 调试技巧
- 标准代码模板
  - React 组件模板
  - 消息监听器模板
  - 存储操作模板
  - 异步操作模板
- 常见问题 FAQ
- 键盘快捷键
- 性能优化建议

**用途**: 日常开发的速查手册,快速找到常用代码模板和解决方案

---

### 更新的配置

#### openspec/config.yaml

**添加的内容**:
- **项目上下文** (context): 完整的项目技术栈、架构模式、编码规范摘要
- **文档规则** (rules):
  - spec 文档的结构要求
  - design 文档的跨浏览器兼容性要求
  - tasks 文档的任务粒度要求

**作用**: 当创建新的 OpenSpec 变更时,AI 会自动了解项目上下文,生成符合规范的文档

---

## 项目核心特点总结

### 1. 消息驱动架构

```
┌──────────────┐
│    Popup     │ ←→ Content Script (tabs.sendMessage)
│              │ ←→ Background (runtime.sendMessage)
└──────────────┘
       ↓
┌──────────────┐
│   Storage    │ (类型安全的 Schema)
└──────────────┘
```

**关键点**:
- 所有消息类型在 `types/messages.ts` 中定义
- 使用 TypeScript 联合类型确保类型安全
- 消息发送和接收都有类型保护

### 2. 跨浏览器兼容方案

**Manifest V3**:
- Chrome: Service Worker + ES Module
- Firefox: Background Script + ES Module
- Content Script: IIFE (所有浏览器)

**Vendor 前缀**:
```json
{
  "__chrome__name": "Chrome版",
  "__firefox__name": "Firefox版",
  "__chrome|firefox__description": "通用描述"
}
```

### 3. 类型安全贯穿始终

- **消息通信**: 类型化的接口 + 联合类型
- **存储操作**: StorageSchema + 默认值
- **React 组件**: FC 类型 + Props 接口
- **异步操作**: 显式返回类型 `Promise<T>`

### 4. 开发体验优化

- **Vite**: 快速的热更新
- **ESLint**: 实时代码检查
- **CSS Modules**: 样式隔离
- **路径别名**: `@/` 指向 source 目录
- **TypeScript**: 全面的类型检查

---

## 后续开发建议

### 新功能开发流程

1. **规划阶段**
   - 在 `types/messages.ts` 中定义新的消息类型
   - 在 `types/storage.ts` 中扩展 StorageSchema (如需要)
   - 创建对应的 spec 文档记录需求

2. **实现阶段**
   - Background/Content/Popup 模块实现消息处理器
   - 遵循编码规范 (FC 类型、CSS Modules、导入顺序)
   - 使用类型安全的工具函数

3. **测试阶段**
   - 使用开发模式快速迭代
   - 在多个浏览器中测试 (Chrome/Firefox)
   - 检查 console 是否有错误

4. **构建发布**
   - 运行 `npm run build` 构建所有浏览器
   - 测试构建产物
   - 提交到相应商店

### 扩展建议

**可以探索的方向**:
1. 添加更多 Content Script 功能 (页面分析、数据提取)
2. 实现 Popup 的更多交互功能
3. 添加 Options 页面的高级设置
4. 集成第三方 API
5. 添加数据同步功能 (使用 chrome.storage.sync)

---

## 关键文件位置速查

| 功能 | 文件位置 |
|------|---------|
| 消息类型定义 | `source/types/messages.ts` |
| 存储 Schema | `source/types/storage.ts` |
| 存储工具函数 | `source/utils/storage.ts` |
| Background 脚本 | `source/Background/index.ts` |
| Content Script | `source/ContentScript/index.ts` |
| Popup 主组件 | `source/Popup/Popup.tsx` |
| Options 主组件 | `source/Options/Options.tsx` |
| 共享组件 | `source/components/` |
| 全局样式变量 | `source/styles/_variables.scss` |
| Manifest 模板 | `source/manifest.json` |
| Vite 配置 | `vite.config.ts` |
| ESLint 配置 | `eslint.config.mjs` |

---

## 学习资源

### 官方文档
- [Chrome Extension MV3](https://developer.chrome.com/docs/extensions/mv3/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Vite](https://vitejs.dev/)

### 项目特定
- 架构规格: `openspec/specs/architecture/spec.md`
- 编码规范: `openspec/specs/coding-standards/spec.md`
- 快速参考: `openspec/specs/quick-reference/spec.md`

---

## 探索结论

PickBetter 项目是一个**工程化程度很高**的浏览器扩展模板,具有以下优势:

✅ **类型安全**: TypeScript 贯穿始终,从消息通信到存储操作
✅ **跨浏览器**: 一套代码,多浏览器运行
✅ **开发体验**: Vite 热更新、ESLint 实时检查
✅ **代码规范**: 清晰的目录结构和编码标准
✅ **架构清晰**: 消息驱动的模块化架构
✅ **可维护性**: CSS Modules 隔离、组件复用、工具函数封装

这些文档为后续开发提供了**完整的知识基础**和**快速参考指南**,可以大大提高开发效率。

---

## 下一步

根据项目需求,可以选择以下方向继续探索:

1. **功能规划**: 创建 OpenSpec 变更提案
2. **原型开发**: 实现新的功能模块
3. **性能优化**: 优化现有代码
4. **测试完善**: 添加单元测试和 E2E 测试
5. **文档更新**: 根据实际开发经验更新文档

所有项目知识都已记录在 OpenSpec 文档中,可以随时查阅和更新。

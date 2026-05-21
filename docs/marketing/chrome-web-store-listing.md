# Chrome Web Store Listing -- CtxPort MVP

> 版本：v1.0 | 日期：2026-02-07
> 作者：Marketing Agent (Seth Godin)
> 状态：待创始人审阅

---

## 1. 扩展基本信息

### 扩展名称

**CtxPort -- Copy AI Chats as Context Bundles**

- 字符数：45（Chrome Web Store name 上限 45 字符）
- "CtxPort" 是品牌名，短、独特、可搜索
- 副标题用破折号补充功能描述，覆盖 "copy"、"AI"、"chat"、"context" 四个核心搜索关键词

备选方案（如果审核对格式有限制）：
- `CtxPort - AI Chat to Context Bundle` (37 chars)
- `CtxPort: Copy AI Conversations` (32 chars)

### 简短描述（Summary, 132 字符内）

> Copy ChatGPT & Claude conversations as structured Markdown bundles. Privacy-first: all processing happens locally. Open source core.

- 字符数：131
- 命中关键词：copy, ChatGPT, Claude, conversations, Markdown, privacy, open source
- 三句话传达三个价值：功能 + 隐私 + 信任

备选方案：
- `One-click copy from ChatGPT & Claude to clean Markdown. Zero uploads, zero tracking. Your AI context, your clipboard.` (119 chars)
- `Export ChatGPT & Claude chats as portable Markdown Context Bundles. 100% local processing. No data ever leaves your browser.` (125 chars)

### 分类建议

**首选分类**：Productivity

理由：
- "Productivity" 是 Chrome Web Store 中流量最大的分类之一
- 竞品 ChatGPT to Markdown (Productivity)、AI Exporter (Productivity) 均在此分类
- 用户搜索 AI 对话导出工具时，Productivity 分类是第一站

---

## 2. 详细描述（Detailed Description）

```
CtxPort copies your AI conversations from ChatGPT and Claude as clean, structured Markdown -- ready to paste into any other AI tool, editor, or note-taking app.

STOP WASTING TIME REBUILDING CONTEXT

Every time you switch between AI tools, you lose 15-30 minutes re-explaining your project, your preferences, your progress. CtxPort eliminates that friction with one click.

HOW IT WORKS

1. Open any conversation on ChatGPT or Claude
2. Click the CtxPort copy button (or press Cmd+Shift+C / Ctrl+Shift+C)
3. Paste the structured Context Bundle anywhere -- Claude Code, Cursor, Notion, or any AI tool

That's it. No accounts. No configuration. No uploads.

KEY FEATURES

Copy Current Conversation
One-click copy of your active conversation as a structured Markdown Context Bundle with metadata (source, date, message count, URL).

Copy from Sidebar Without Opening
Each conversation in the sidebar has a copy icon. Copy any conversation without opening it first -- saving clicks and time.

Batch Select & Copy
Enter multi-select mode, check the conversations you need, and merge them into a single Context Bundle with one click.

Multiple Format Options
- Full conversation (default)
- User messages only
- Code blocks only
- Condensed summary

Keyboard Shortcuts
- Cmd+Shift+C / Ctrl+Shift+C: Copy current conversation
- Cmd+Shift+E / Ctrl+Shift+E: Toggle batch selection mode

PRIVACY & SECURITY -- OUR #1 PRINCIPLE

After the 2025 browser extension data breaches that affected 900,000+ users, we built CtxPort with privacy as the foundation, not an afterthought:

- ZERO external network requests: All HTML parsing and Markdown conversion happens 100% in your browser. CtxPort never contacts any external server.
- Minimal permissions: Only activeTab + storage. No tabs, history, cookies, or webRequest permissions.
- Open source core: The conversation extraction and bundle generation logic is 100% open source (MIT License). Audit it yourself on GitHub.
- Verify it yourself: Open DevTools > Network tab while using CtxPort. You will see zero outgoing requests.

WHAT IS A CONTEXT BUNDLE?

A Context Bundle is a structured Markdown document that preserves:
- Conversation metadata (source platform, date, message count, URL)
- Clear role separation (User / Assistant)
- Code blocks with language tags and formatting
- The full conversation flow, ready to feed into another AI

Unlike raw copy-paste, a Context Bundle gives the receiving AI tool the full picture -- who said what, in what order, with what code.

SUPPORTED PLATFORMS

- ChatGPT (chat.openai.com / chatgpt.com)
- Claude (claude.ai)
- More platforms coming soon

WHO IS THIS FOR?

- Developers switching between ChatGPT, Claude, Claude Code, and Cursor
- AI power users who use multiple AI tools daily
- Anyone tired of re-explaining context every time they open a new chat

OPEN SOURCE

CtxPort's core logic is MIT-licensed and available on GitHub. We believe trust is earned through transparency, not promises.

---

Questions or feedback? File an issue on GitHub or reach out at [support email].
```

说明：
- 总字符数约 2,300，在 Chrome Web Store 详细描述的合理范围内
- 结构清晰，用大写标题分段（Chrome Web Store 不支持 Markdown 渲染，但全大写标题在纯文本中有效）
- 前两段即传达核心价值，不浪费用户注意力
- PRIVACY 段独立且前置，直接回应市场信任危机
- 避免夸张用语和营销黑话，用事实和可验证的声明建立信任

---

## 3. 视觉素材需求

### 3.1 扩展图标 (128x128)

**设计方向**：
- 主色：深蓝或靛蓝（传达信任、技术感）
- 图形：简化的"端口/连接"符号，暗示 context 在工具间流动
- 风格：扁平、几何、高辨识度，在 16x16 favicon 尺寸下仍可识别
- 避免：渐变过多、细节过密、AI/机器人图案（太泛滥）

### 3.2 Screenshots（最少 1 张，建议 5 张）

Chrome Web Store 要求 1280x800 或 640x400 像素。

**截图 1 -- Hero Shot**
- 内容：ChatGPT 页面 + CtxPort 复制按钮 + 复制成功 toast 提示
- 文案叠加：`One Click. Clean Markdown. Zero Uploads.`
- 目的：3 秒内让用户理解产品做什么

**截图 2 -- Sidebar Copy**
- 内容：ChatGPT 左侧会话列表，每条会话旁显示 CtxPort 复制图标
- 文案叠加：`Copy Without Opening -- Save Clicks, Save Time`
- 目的：展示独特的"不打开就能复制"功能（竞品没有的差异化功能）

**截图 3 -- Batch Select**
- 内容：多选模式下，3-5 条会话被勾选，底部出现"Copy 5 Conversations"按钮
- 文案叠加：`Select Multiple. Merge Into One Bundle.`
- 目的：展示批量复制能力

**截图 4 -- Context Bundle Output**
- 内容：剪贴板内容展示（用编辑器或 Markdown 预览），显示结构化的 Context Bundle
- 文案叠加：`Structured Markdown -- Ready for Any AI Tool`
- 目的：让用户看到输出质量

**截图 5 -- Privacy**
- 内容：Chrome DevTools Network 面板 + CtxPort 操作 = 零外部请求
- 文案叠加：`Your Data Never Leaves Your Browser. Verify It Yourself.`
- 目的：用可视化证据建立信任，这是最强的安全叙事

### 3.3 Promotional Images

**Small Promo Tile (440x280)**
- 内容：CtxPort logo + 一句话 tagline
- 文案：`Your AI Context, Portable.`
- 背景：深蓝渐变，简洁

**Marquee Promo (1400x560)**（如果获得 Featured 推荐时使用）
- 内容：左侧 CtxPort logo + 中间流程图（ChatGPT -> CtxPort -> Claude）+ 右侧 Context Bundle 预览
- 文案：`Stop Re-explaining. Start Porting Context.`

---

## 4. SEO 与关键词策略

### 4.1 目标关键词（按优先级排序）

**Tier 1 -- 高搜索量、直接意图**
| 关键词 | 搜索意图 | 覆盖位置 |
|--------|---------|---------|
| `chatgpt export` | 导出 ChatGPT 对话 | 名称、描述 |
| `copy chatgpt conversation` | 复制 ChatGPT 对话 | 名称、描述 |
| `claude export` | 导出 Claude 对话 | 描述 |
| `ai chat exporter` | AI 对话导出工具 | 描述 |
| `chatgpt to markdown` | ChatGPT 转 Markdown | 描述 |

**Tier 2 -- 中搜索量、差异化意图**
| 关键词 | 搜索意图 | 覆盖位置 |
|--------|---------|---------|
| `context bundle` | 上下文打包（新概念，需教育） | 名称、描述 |
| `ai context migration` | AI 上下文迁移 | 描述 |
| `copy ai conversation clipboard` | 复制到剪贴板 | 描述 |
| `chatgpt claude copy` | 跨平台复制 | 描述 |
| `ai chat privacy extension` | 隐私优先的 AI 扩展 | 描述 |

**Tier 3 -- 长尾关键词、低竞争**
| 关键词 | 搜索意图 | 覆盖位置 |
|--------|---------|---------|
| `copy chatgpt without opening` | 不打开就复制（CtxPort 独有） | 描述 |
| `batch copy ai conversations` | 批量复制 | 描述 |
| `ai chat local processing` | 本地处理 | 描述 |
| `open source ai exporter` | 开源导出工具 | 描述 |
| `context engineering tool` | 上下文工程工具 | 描述 |

### 4.2 关键词分布策略

- **名称（45 chars）**：品牌名 + 最高价值关键词（Copy, AI, Chat, Context）
- **简短描述（132 chars）**：Tier 1 关键词密集覆盖（ChatGPT, Claude, Markdown, privacy, open source）
- **详细描述**：自然语言覆盖全部 Tier 1-3 关键词，避免关键词堆砌
- **注意**：Chrome Web Store 的搜索算法权重为 名称 > 简短描述 > 详细描述

---

## 5. 竞品 Listing 分析与差异化策略

### 5.1 主要竞品

| 竞品 | 定位 | 弱点 |
|------|------|------|
| ChatGPT to Markdown | 单平台导出为文件 | 仅 ChatGPT；导出到文件而非剪贴板 |
| ChatGPT to Markdown Pro | 单平台，LaTeX/Table 特化 | 仅 ChatGPT；面向学术场景 |
| AI Exporter | 多平台导出 + Notion 同步 | 需网络上传（Notion sync）；评分 3.9 |
| AI Chat Exporter | Gemini + ChatGPT | 不支持 Claude；主打 LaTeX |
| Save My Chatbot | 多平台导出 | 功能分散，无聚焦 |
| YourAIScroll | 多平台导出 | 新进入者，功能未验证 |

### 5.2 CtxPort 差异化卖点（按说服力排序）

**1. Privacy-First Architecture（信任杀手锏）**
- 竞品大多需要网络权限或上传数据（如 Notion sync）
- CtxPort 零外部请求，可用 DevTools 验证
- 在 2025 安全事件后，这是用户决策的第一过滤条件
- **Listing 策略**：在简短描述和详细描述的前 3 段就强调隐私

**2. Copy Without Opening（功能差异化）**
- 没有任何竞品支持从侧栏列表直接复制
- 将 4 步操作（点击会话 -> 等加载 -> 复制 -> 返回列表）缩减为 1 步
- **Listing 策略**：作为第二个 feature 突出展示，截图 2 专门呈现

**3. Batch Multi-Select（效率差异化）**
- 竞品要么无批量，要么需逐个操作
- CtxPort 勾选多条，一键合并为单一 Bundle
- **Listing 策略**：截图 3 + 详细描述中的 "Batch Select & Copy" 段

**4. Clipboard-First, Not File-First（工作流差异化）**
- 竞品导出为文件（需要找文件、打开文件、复制内容）
- CtxPort 直接到剪贴板，粘贴即用
- **Listing 策略**："HOW IT WORKS" 三步流程中体现

**5. Open Source Core（信任 + 社区）**
- 多数竞品闭源
- 开源不仅是信任信号，还能吸引 contributor 和 GitHub stars
- **Listing 策略**：描述末尾 + GitHub 链接

---

## 6. 发布策略

### 6.1 发布时间建议

- **工作日发布**（周二或周三），避开周末（用户活跃度低）
- Chrome Web Store 审核通常 1-3 个工作日，提前提交
- 发布后 24 小时内在各渠道同步推广（与运营协调）

### 6.2 评分与评论冷启动

Chrome Web Store 评分对搜索排名和用户信任至关重要。

**行动计划**：
1. 发布后请 10 个早期 beta 测试者在 Web Store 留下真实评价
2. 在扩展内加入温和的评价引导（使用 3 次后弹出一次性提示）
3. 对每条评论都回复——展示活跃维护和对用户的尊重
4. **绝对不做**：购买评论、自己写假评论、用机器刷评——Chrome 的检测机制很成熟，风险极高

### 6.3 版本迭代策略

- v0.1.0 发布时保持描述简洁，聚焦核心功能
- 后续版本更新描述时加入 "What's New" 段落
- 每次更新都是一次曝光机会（更新通知 + changelog）

---

## 7. Listing 检查清单

发布前逐项确认：

- [ ] 扩展名称：45 字符内，包含品牌名和核心关键词
- [ ] 简短描述：132 字符内，命中 Tier 1 关键词
- [ ] 详细描述：结构清晰，前 3 段覆盖核心价值
- [ ] 分类：Productivity
- [ ] 图标：128x128，16x16 下仍可识别
- [ ] 截图：至少 3 张（推荐 5 张），1280x800
- [ ] 小宣传图：440x280
- [ ] 隐私政策 URL：链接到 GitHub repo 中的 PRIVACY.md
- [ ] 官方网站 URL：GitHub repo 链接（或独立 landing page）
- [ ] 支持 URL：GitHub Issues 链接
- [ ] 权限说明：在 Privacy practices 中解释 activeTab 和 storage 的用途
- [ ] 无违规内容：避免在描述中使用 "ChatGPT" 或 "Claude" 作为品牌抢注

---

## 8. 关于商标使用的注意事项

在 Chrome Web Store listing 中使用 "ChatGPT" 和 "Claude" 时需注意：

1. **名称中**：使用 "AI Chats" 而非 "ChatGPT & Claude"，避免商标争议
2. **描述中**：可以提及支持的平台名称，但要明确这是第三方工具
3. **截图中**：展示真实使用场景是合理的，但不要暗示官方关系
4. 在详细描述的底部可以加入声明：`CtxPort is an independent project and is not affiliated with OpenAI or Anthropic.`

---

## Next Actions

1. **UI 设计团队**：根据第 3 节的视觉素材需求制作图标、截图和宣传图
2. **全栈开发**：确保 manifest.json 中的 name 和 description 与 listing 一致
3. **创始人审阅**：确认扩展名称、简短描述的最终版本
4. **法务/合规**：准备隐私政策文档（PRIVACY.md）
5. **运营团队**：协调发布时间和推广渠道同步

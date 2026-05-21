# CtxPort Growth Strategy 2026 — From 0 to 1000 Stars

> Version: v1.0 | Date: 2026-02-07
> Author: Marketing Agent (Seth Godin)
> Status: Actionable playbook for cold start and sustained growth

---

## 0. Strategic Context

CtxPort is at Day 0. Zero stars, zero users. The good news: every great product started here.

The bad news: there are hundreds of "AI chat exporter" extensions. Most of them are invisible because they're unremarkable. They copy the conversation, export it as a file, and call it a day.

**CtxPort's job is not to be "another AI exporter." It's to be the one people can't stop talking about.**

The strategy below is built on one principle: **earn attention, don't buy it.** Every action is designed to create organic word-of-mouth. There is zero paid advertising in this plan.

---

## 1. The Purple Cow: What Makes CtxPort Worth Talking About

Before any growth tactic, we need clarity on why anyone would tell a friend about CtxPort. Three reasons:

1. **"You don't even have to open the conversation."** — Sidebar copy is the feature no competitor has. It's the "wait, what?" moment that drives word-of-mouth.
2. **"Zero network requests. I checked."** — In a post-breach world, verifiable privacy is a story people share.
3. **"It just works across 6 platforms."** — ChatGPT, Claude, Gemini, DeepSeek, Grok, GitHub. Broadest coverage in the market.

Every marketing action below is designed to put one of these three facts in front of the right people.

---

## 2. Cold Start Playbook: First 1,000 Stars

### 2.1 Reddit Strategy

Reddit is the #1 channel for developer tool cold start. But Reddit hates self-promotion. The strategy is: **be genuinely helpful first, then mention the tool when it's relevant.**

#### Target Subreddits (Tier 1 — Post directly)

| Subreddit | Subscribers | Angle | Post Type |
|-----------|------------|-------|-----------|
| r/ChatGPT | 7M+ | "I built a tool that copies ChatGPT conversations as clean Markdown — without even opening them" | Show & Tell + GIF demo |
| r/ClaudeAI | 500K+ | "Switching context between Claude and ChatGPT? I built a clipboard tool for that" | Discussion + tool mention |
| r/artificial | 1M+ | "The hidden cost of AI tool switching: context loss. Here's my solution" | Thought piece + soft CTA |
| r/webdev | 2M+ | "Browser extension dev learnings: building a Manifest V3 extension with zero network requests" | Technical writeup |
| r/SideProject | 300K+ | "Show my side project: CtxPort — copy AI conversations as Markdown with one click" | Standard side project showcase |

#### Target Subreddits (Tier 2 — Comment and engage)

| Subreddit | Strategy |
|-----------|----------|
| r/ChatGPTPro | Answer questions about exporting/saving conversations, mention CtxPort when relevant |
| r/LocalLLaMA | Engage in privacy discussions, mention zero-upload architecture |
| r/ProductivityApps | Respond to "best Chrome extensions" threads |
| r/coding | Comment on AI-assisted development threads |
| r/ArtificialIntelligence | Engage in context window / prompt engineering discussions |

#### Reddit Posting Rules

1. **Never post more than once per subreddit per month** — Reddit's spam detection is aggressive
2. **GIF demos are mandatory** — A 3-5 second GIF of sidebar copy is worth 1000 words on Reddit
3. **Always engage with comments** — Every comment is an opportunity to demonstrate you care about users
4. **Lead with the problem, not the product** — "Do you ever lose 30 minutes re-explaining your project to a different AI?" is better than "Check out my extension!"
5. **Be transparent about being the maker** — "I built this" is Reddit's language. Pretending to be a random user will get you banned

#### Timing

- **Week 1-2**: Post to r/SideProject and r/ChatGPT (these are the most open to side project showcases)
- **Week 3-4**: Post to r/ClaudeAI and r/artificial
- **Ongoing**: Daily engagement in comments across all Tier 2 subreddits (5-10 helpful comments per week)

---

### 2.2 Hacker News (Show HN) Strategy

Hacker News is high-risk, high-reward. A front-page Show HN can generate 200+ stars in a day. A failed one gets 3 upvotes and disappears. The difference is in the framing.

#### Post Title Options (pick one)

- `Show HN: CtxPort – Copy AI conversations as Markdown, even from the sidebar without opening them`
- `Show HN: I built a browser extension to move context between AI tools (zero uploads, open source)`
- `Show HN: CtxPort – One-click AI conversation to Markdown. Works on ChatGPT, Claude, Gemini, DeepSeek, Grok`

**Recommended**: Option 2 — it leads with the problem (moving context), mentions the trust factors (zero uploads, open source), and doesn't sound like a product listing.

#### Post Body Structure

```
CtxPort is a browser extension that copies AI conversations as structured Markdown "Context Bundles."

The core insight: AI conversations are the new unit of knowledge work, but there's no clipboard for them. You can't easily move a ChatGPT conversation to Claude, or save it in a format that another AI can understand.

Key technical decisions:
- Zero network requests — all HTML parsing happens locally in the browser
- Manifest V3 with minimal permissions (activeTab + storage only)
- Open source core (MIT) — the extraction and conversion logic is fully auditable

The feature I'm most proud of: you can copy conversations directly from the sidebar list without opening them. Hover, click, done.

Supported platforms: ChatGPT, Claude, Gemini, DeepSeek, Grok, GitHub

GitHub: [link]
Chrome Web Store: [link]

I'd love feedback, especially on the Markdown output format and security model.
```

#### HN Timing

- **Post between 8-10 AM EST on Tuesday/Wednesday** — peak HN traffic
- **Be online for the first 3 hours after posting** — responding to comments quickly is critical for staying on the front page
- **Do NOT ask friends to upvote** — HN detects voting rings and will penalize/ban

#### HN Topics That Resonate

HN cares about:
1. Technical decisions and tradeoffs ("why zero network requests matters")
2. Privacy and security architecture
3. Open source philosophy
4. Novel UX solutions ("sidebar copy without opening")

HN does NOT care about:
1. "I'm a solo developer" sob stories
2. Feature comparison tables
3. Business model discussions (in Show HN context)

---

### 2.3 Twitter/X Strategy

Twitter is the long game. It won't generate 100 stars overnight, but it builds a compounding audience over 3-6 months.

#### Account Strategy

Use the founder's personal account, not a brand account. People follow people, not products.

#### Content Calendar (Weekly)

| Day | Content Type | Example |
|-----|-------------|---------|
| Mon | Build in Public update | "This week I'm working on Gemini support for CtxPort. The DOM structure is... interesting." |
| Wed | Context Engineering insight | "Context Rot: why pasting raw text into a new AI chat loses 40% of the useful information. Thread." |
| Fri | Product demo / GIF | 3-second GIF showing sidebar copy, with a one-line caption |

#### Hashtags & Keywords

Use in tweets (not all at once — pick 1-2 per tweet):
- #BuildInPublic
- #IndieHacker
- #ContextEngineering
- #AITools
- #ChromeExtension
- #OpenSource

#### Engagement Strategy

- Follow and engage with: AI tool builders, indie hackers (Pieter Levels, Marc Lou, Danny Postma), developer advocates at OpenAI/Anthropic/Google
- Reply to tweets about "AI workflow," "context switching," "prompt engineering" — add genuine value, don't just plug the product
- Quote-tweet interesting AI conversations and add your perspective

---

### 2.4 Product Hunt Launch

Product Hunt is a one-shot event. Time it carefully.

#### Prerequisites (do NOT launch until these are met)

1. Chrome Web Store listing is polished (5 screenshots, all copy finalized)
2. Website (ctxport.xiaominglab.com) is live and looks professional
3. GitHub README has a compelling GIF demo
4. At least 20 Chrome Web Store reviews (minimum 4.5 stars)
5. At least 50 GitHub stars (social proof)

#### Launch Execution

1. **Find a Hunter**: Reach out to a Product Hunt top hunter 2 weeks before launch. A hunt from a respected hunter gets 3-5x more visibility than a self-hunt
2. **Launch Day**: Tuesday or Wednesday, midnight PT (Product Hunt resets daily at midnight PT)
3. **Tagline**: "Copy AI conversations as portable Markdown — without even opening them" (80 chars)
4. **First Comment**: Founder posts a genuine story: why you built it, what problem it solves for you personally
5. **Rally Support**: Notify everyone who already uses CtxPort via email/Discord. Ask them to visit (not to upvote — just visit and comment if they genuinely like it)

#### Estimated Timeline

- **Do NOT launch on Product Hunt before Week 8-12** — you need social proof first
- Build stars and reviews organically first, then use PH as an amplifier

---

### 2.5 Chinese Community Strategy

CtxPort's founder is based in China. The Chinese developer community is a natural early adopter base.

#### V2EX

- Post in the "分享创造" (Share & Create) section
- Title: "CtxPort: 一键复制 AI 对话为结构化 Markdown，支持 ChatGPT/Claude/Gemini/DeepSeek/Grok"
- V2EX developers are privacy-conscious and appreciate open source — lean into these angles
- Timing: Weekday mornings (China time)

#### Juejin (掘金)

- Write a technical article: "如何构建一个零网络请求的浏览器扩展：CtxPort 的安全架构"
- Tag: Chrome Extension, AI, Open Source, Privacy
- Juejin audience loves technical deep-dives — don't just announce, educate

#### Zhihu (知乎)

- Answer existing questions about "AI 对话导出" "ChatGPT 复制" "如何在 AI 工具之间迁移上下文"
- Write an article: "Context Engineering：为什么 AI 对话的「搬运」比你想象的更重要"
- Zhihu is long-form — invest in quality over quantity

#### Xiaohongshu (小红书)

- Skip for now. Xiaohongshu skews consumer/lifestyle. Developer tools don't fit the platform.

#### WeChat / Telegram Groups

- Join AI-related developer groups
- Don't spam links — participate in discussions, share the tool when someone asks about exporting AI conversations

---

## 3. GitHub Ecosystem Strategy

### 3.1 Awesome Lists Submissions

These are high-leverage, one-time actions. Each successful submission generates a permanent backlink and discovery channel.

| Awesome List | Repository | Relevance | Submission Strategy |
|-------------|-----------|-----------|-------------------|
| awesome-chatgpt | search GitHub for "awesome-chatgpt" lists | Direct — ChatGPT tools | Submit under "Browser Extensions" or "Productivity" section |
| awesome-chrome-extensions | Various curated lists | Direct — Chrome extensions | Submit under "Productivity" or "AI" section |
| awesome-ai-tools | Multiple repos | Direct — AI tools | Submit under "Developer Tools" or "Productivity" |
| awesome-claude | If exists | Direct — Claude tools | Submit under "Integrations" |
| awesome-open-source | Various | Indirect — open source showcase | Submit with privacy angle |
| awesome-privacy | Multiple repos | Indirect — privacy tools | Submit as "privacy-first AI tool" |
| awesome-selfhosted / awesome-local-first | Various | Indirect — local processing | Submit with "zero upload" angle |
| awesome-markdown | Various | Tangential — Markdown tools | Submit under "Conversion" |

**Submission Process:**
1. Star the awesome list first (etiquette)
2. Read the contribution guidelines carefully
3. Submit a PR with a one-line description matching the list's format
4. Be patient — many lists take 1-4 weeks to review PRs

### 3.2 GitHub Trending Strategy

Getting on GitHub Trending is algorithmic: it's based on **stars velocity** (stars per unit time), not total stars.

**Strategy:**
- Concentrate star-generating activities (Reddit posts, HN, PH) into a 48-hour window
- If a Reddit post takes off, immediately post to Twitter, then submit to a few awesome lists
- The compounding effect of simultaneous visibility can push you onto Trending for a day
- Even 1 day on Trending can generate 50-200 stars

**What NOT to do:**
- Do NOT use star-buying services — GitHub detects and removes fake stars
- Do NOT create multiple accounts to star yourself
- Do NOT participate in "star for star" exchanges

### 3.3 Cross-Promotion with Related Projects

Identify open source projects with overlapping audiences and look for collaboration opportunities:

| Project Type | Collaboration Angle |
|-------------|-------------------|
| AI CLI tools (aider, Claude Code, Cursor) | "CtxPort exports context that feeds into these tools" — mention in discussions |
| Markdown editors (Obsidian, Logseq) | "Context Bundles are standard Markdown — import into your PKM" |
| Privacy-focused extensions | Cross-list in each other's READMEs |
| Open source AI tools | Engage in their communities, build relationships |

---

## 4. Content Marketing & SEO

### 4.1 Blog / Article Calendar

Write and publish on Dev.to, personal blog, or Medium (cross-post to all three).

#### High-Priority Articles (First 30 Days)

| # | Title | Target Audience | SEO Keywords | Publish To |
|---|-------|----------------|-------------|-----------|
| 1 | "Context Engineering: Why Copy-Paste Doesn't Work for AI Conversations" | AI power users | context engineering, AI workflow, prompt engineering | Dev.to, HN |
| 2 | "Building a Zero-Upload Browser Extension: CtxPort's Security Architecture" | Developers, security-conscious users | browser extension security, manifest v3, privacy | Dev.to, HN |
| 3 | "I Built a Product with an AI Agent Team — Here's What Happened" | Indie hackers, AI enthusiasts | AI agents, solo founder, build in public | Dev.to, Twitter thread, HN |

#### Ongoing Articles (Monthly)

| Topic Area | Example Titles |
|-----------|---------------|
| Context Engineering | "Context Rot: How AI Conversations Lose Value Over Time" |
| Build in Public | "Month 1 Numbers: X installs, Y% retention, Z lessons" |
| Technical Deep-Dives | "Parsing ChatGPT's DOM: The Hidden Complexity of Web Scraping" |
| Privacy & Security | "How to Audit a Browser Extension's Network Requests in 5 Minutes" |
| AI Workflow | "My Multi-AI Workflow: How I Use 3 AI Tools Without Losing Context" |

### 4.2 SEO Keyword Targets

#### Primary Keywords (target with blog content + landing page)

| Keyword | Monthly Search Volume (est.) | Difficulty | Content Type |
|---------|------------------------------|-----------|-------------|
| chatgpt export conversation | High | Medium | Landing page + blog post |
| copy chatgpt to markdown | Medium | Low | Blog post |
| claude ai export | Medium | Low | Blog post |
| ai chat exporter | Medium | Medium | Landing page |
| chatgpt to markdown extension | Medium | Low | Chrome Web Store listing |
| context engineering | Growing (new term) | Low | Blog series (own this term) |

#### Long-Tail Keywords (target with blog content)

| Keyword | Content Strategy |
|---------|-----------------|
| how to copy chatgpt conversation | Tutorial blog post |
| export ai conversation as markdown | Feature-focused blog post |
| privacy browser extension ai | Security architecture blog post |
| switch between chatgpt and claude | Workflow blog post |
| save ai conversation locally | Privacy-focused blog post |

### 4.3 SEO for the Landing Page

The website (ctxport.xiaominglab.com) should target:

1. **Title tag**: "CtxPort — Copy AI Conversations as Structured Markdown | ChatGPT, Claude, Gemini"
2. **Meta description**: "One-click copy from ChatGPT, Claude, Gemini, DeepSeek, Grok & GitHub. Structured Markdown Context Bundles. Zero upload, 100% local processing. Open source."
3. **H1**: "Copy AI Conversations as Portable Context Bundles"
4. **Content**: Include a FAQ section targeting long-tail queries ("How do I export a ChatGPT conversation?", "How to copy Claude conversation to Markdown?")

---

## 5. Community Building

### 5.1 Discord / Telegram: When to Build?

**Not now.** Here's the framework:

| Stage | Community Action |
|-------|-----------------|
| 0-100 users | No community needed. Handle feedback via GitHub Issues |
| 100-500 users | Create a Discord server, but keep it small and invite-only (early adopters) |
| 500-2000 users | Open Discord to public, create channels for #feedback, #feature-requests, #showcase |
| 2000+ users | Consider Telegram group for Chinese-speaking users |

**Why not now?** An empty Discord server is worse than no Discord server. It signals "nobody uses this." Wait until you have enough engaged users to sustain conversation organically.

### 5.2 GitHub Issues as Early Community

GitHub Issues is your community platform for the first 6 months:

1. **Use issue templates**: Bug report, Feature request, Question
2. **Respond to every issue within 24 hours** — speed of response is the #1 signal of a healthy open source project
3. **Use labels generously**: `good first issue`, `help wanted`, `enhancement`, `bug`
4. **Pin a "Roadmap" issue** — let users see where the project is going and vote with reactions

### 5.3 Contributor Incentives

#### For Code Contributors

1. **"good first issue" labels** — low-barrier entry points for new contributors
2. **Clear CONTRIBUTING.md** — reduce friction to first PR
3. **Fast PR review** — merge or provide feedback within 48 hours
4. **Contributors section in README** — public recognition
5. **Co-author credits in release notes** — celebrate every contribution

#### For Non-Code Contributors

1. **Translation**: CtxPort supports i18n — invite community translations
2. **Documentation**: Reward improvements to docs with shoutouts
3. **Bug reports**: Thank detailed bug reporters publicly
4. **Feature ideas**: Implement community-voted features and credit the requester

---

## 6. Growth Metrics & Milestones

### 6.1 North Star Metric

**Weekly Active Users (WAU)** — not stars, not downloads. WAU measures whether people are actually using CtxPort as part of their workflow.

Stars are social proof. Downloads are vanity. Usage is truth.

### 6.2 Milestone Targets

| Milestone | Target | Timeline | Key Actions |
|-----------|--------|----------|-------------|
| First 10 stars | Week 1-2 | Personal network + V2EX + r/SideProject |
| First 50 stars | Week 3-4 | Reddit (r/ChatGPT, r/ClaudeAI) + first blog post |
| First 100 stars | Week 5-6 | Show HN + Twitter thread + awesome list submissions |
| 250 stars | Week 8-10 | Sustained content marketing + community engagement |
| 500 stars | Week 12-16 | Product Hunt launch + Chinese community push |
| 1000 stars | Week 20-24 | Compounding organic growth + trending push |

### 6.3 What to Track

| Metric | Tool | Frequency |
|--------|------|-----------|
| GitHub stars velocity | GitHub Insights | Daily (first month), then weekly |
| Chrome Web Store installs | CWS Developer Dashboard | Weekly |
| WAU (Weekly Active Users) | chrome.storage analytics | Weekly |
| 7-day retention | chrome.storage analytics | Weekly |
| Reddit referral traffic | Website analytics | Weekly |
| Twitter impressions & followers | Twitter Analytics | Weekly |
| Chrome Web Store rating | CWS Developer Dashboard | Weekly |

### 6.4 When to Worry

| Signal | Meaning | Action |
|--------|---------|--------|
| Stars growing but WAU flat | People star but don't install/use | Improve onboarding, check if product delivers on README promise |
| High install, low retention | Product disappoints after install | User interviews, check for bugs, improve core experience |
| Reddit posts get no traction | Wrong framing or wrong subreddit | Test different angles, try different subreddits |
| HN post dies immediately | Title didn't resonate | Wait 2 weeks, repost with different angle |
| Zero organic mentions after Month 2 | Product isn't remarkable enough | Go back to product — the Purple Cow factor isn't strong enough yet |

---

## 7. Channel Priority Matrix

Not all channels are equal. Here's the priority order based on effort-to-impact ratio:

| Priority | Channel | Effort | Expected Impact | Timeline |
|----------|---------|--------|----------------|----------|
| P0 | Reddit (r/ChatGPT, r/ClaudeAI, r/SideProject) | Low | High (first 50-100 stars) | Week 1+ |
| P0 | Hacker News (Show HN) | Medium | Very High if it hits (100-300 stars) | Week 4-6 |
| P0 | GitHub Awesome Lists | Low | Medium (steady trickle of 2-5 stars/week) | Week 2+ |
| P1 | Twitter/X (Build in Public) | Medium (ongoing) | Medium (compounding over months) | Week 1+ |
| P1 | V2EX + Juejin + Zhihu | Medium | Medium (Chinese developer audience) | Week 2+ |
| P1 | Dev.to / Blog SEO | Medium (ongoing) | Medium-High (compounds with SEO) | Week 3+ |
| P2 | Product Hunt | High (one-shot) | High if prepared | Week 8-12 |
| P2 | YouTube / Video content | High | Medium | Month 3+ |
| P3 | Paid advertising | N/A | Skip entirely pre-PMF | Never (pre-PMF) |

---

## 8. What NOT to Do

This section is as important as the strategy itself.

| Don't | Why |
|-------|-----|
| Don't buy stars or fake reviews | GitHub and Chrome Web Store detect and penalize. One violation can kill the project's credibility permanently |
| Don't spam Reddit/HN | One ban = permanent loss of the most valuable discovery channel |
| Don't build a community too early | An empty Discord is worse than no Discord |
| Don't run paid ads pre-PMF | Paid ads amplify what's working. If nothing is working, you're amplifying nothing |
| Don't compare to competitors publicly | "We're better than X" is weak. "We solve Y problem" is strong |
| Don't optimize for stars at the expense of product | Stars without retention is a vanity trap. Focus on making the product genuinely useful first |
| Don't spread too thin | Focus on 2-3 channels at a time. Do them well. Move on when they're working |

---

## 9. Execution Checklist

### Week 1-2: Foundation

- [ ] Record a 3-5 second GIF demo of sidebar copy (this is the #1 marketing asset)
- [ ] Ensure GitHub README has the GIF prominently displayed
- [ ] Post to r/SideProject with GIF
- [ ] Post to V2EX "分享创造"
- [ ] Start Twitter Build in Public (3 tweets/week)
- [ ] Submit to 3 awesome lists

### Week 3-4: Reddit Push

- [ ] Post to r/ChatGPT (lead with the problem, include GIF)
- [ ] Post to r/ClaudeAI
- [ ] Write first Dev.to article (Context Engineering topic)
- [ ] Engage daily in Reddit comments (5-10 helpful replies/week)

### Week 5-6: Hacker News

- [ ] Submit Show HN (Tuesday/Wednesday, 8-10 AM EST)
- [ ] Be online for 3+ hours after posting to respond to comments
- [ ] If HN hits front page, immediately tweet about it (compounding visibility)
- [ ] Write second blog post (security architecture topic)

### Week 7-8: Content Flywheel

- [ ] Publish Zhihu article
- [ ] Publish Juejin technical article
- [ ] Continue Twitter cadence
- [ ] Submit to 3 more awesome lists
- [ ] Evaluate: Do we have 50+ stars? If yes, start planning Product Hunt

### Week 9-12: Product Hunt Prep & Launch

- [ ] Ensure 20+ Chrome Web Store reviews
- [ ] Find a Product Hunt hunter
- [ ] Prepare PH assets (tagline, description, screenshots, first comment)
- [ ] Launch on Product Hunt
- [ ] Post launch recap on Twitter and Reddit

---

## 10. The One Thing That Matters Most

If you remember nothing else from this document, remember this:

**The product is the marketing.**

No Reddit post, no HN submission, no Twitter thread will save a product that doesn't make users say "you should try this."

If CtxPort's sidebar copy makes someone's jaw drop for half a second — if the clean Markdown output makes someone feel "this tool gets me" — if the zero-upload architecture makes a security-conscious developer trust it instantly — then every channel in this document will work.

If it doesn't, none of them will.

Build the Purple Cow first. Then let the world discover it.

---

> "In a crowded marketplace, fitting in is failing. In a busy marketplace, not standing out is the same as being invisible."
>
> — Seth Godin, *Purple Cow*

import "./styles.css";

const navItems = [
  ["products", "产品"],
  ["method", "方法"],
  ["proof", "案例"],
  ["contact", "下单"],
];

const products = [
  {
    slug: "ai-consulting",
    type: "诊断",
    name: "30分钟 AI 咨询",
    price: "¥199",
    oneLine: "先判断你现在最该做什么，避免一上来乱买课。",
    fit: "适合还不确定方向、预算和切入点的人。",
    deliverables: [
      "梳理你的业务、账号、产品和当前卡点。",
      "判断适合先学课、做 GEO、做小程序、自媒体陪跑，还是直接定制。",
      "给出下一步行动建议，不适合的方向会直接说清楚。",
    ],
  },
  {
    slug: "doubao-geo-course",
    type: "认知课",
    name: "豆包 GEO 7节认知小课",
    price: "¥399",
    oneLine: "讲明白 AI 搜索推荐逻辑，以及本地服务行业的新获客机会。",
    fit: "适合医美、财税、教育、维修、招商等本地服务和高客单行业。",
    deliverables: [
      "理解 GEO 和传统 SEO、小红书搜索的区别。",
      "判断自己的行业有没有被豆包 AI 推荐的机会。",
      "知道该补内容、补页面、补问答，还是先别急着做。",
    ],
  },
  {
    slug: "wechat-mini-program",
    type: "实战课",
    name: "零基础微信小程序全套上架流程",
    price: "¥599",
    oneLine: "从想法、页面、功能、配置到审核上架，把完整流程走通。",
    fit: "适合想做出第一个微信小程序，并把它当成 AI 项目能力证明的人。",
    deliverables: [
      "微信小程序从注册、配置、开发工具到提交上架的完整路径。",
      "用 AI 辅助生成页面、文案、功能说明和基础代码。",
      "整理审核卡点、类目选择、隐私协议和上线前检查清单。",
    ],
  },
  {
    slug: "codex-ai-coding",
    type: "实战课",
    name: "Codex 最强实战：零基础 AI 编程",
    price: "¥599",
    oneLine: "不会写代码也能用 Codex 做出能跑的页面、工具和项目原型。",
    fit: "适合普通人、小老板、创作者，用 Codex 做网站、小工具和副业项目。",
    deliverables: [
      "Codex 怎么读项目、改页面、修 bug、跑测试，而不是只聊天。",
      "从一句需求拆成页面、组件、数据、样式和上线步骤。",
      "学会验收 AI 交付结果，避免瞎改和反复返工。",
    ],
  },
  {
    slug: "ai-transform-mentor",
    type: "陪跑",
    name: "个体 AI 转型自媒体月度陪跑",
    price: "¥2,699 / 月",
    oneLine: "AI 时代两条腿走路：用 Codex 做业务结果，再把过程拍成内容。",
    fit: "适合普通人、小老板、个体服务者，想做出真实业务结果和获客能力。",
    featured: true,
    deliverables: [
      "第一条腿：用 Codex 做网站、小程序、软件工具、管理系统、课程配套工具。",
      "第二条腿：拍“我今天用 AI 解决了一个真实问题”，而不是模仿对标账号。",
      "围绕真实业务场景连续出内容，击中需求后集中火力继续打。",
    ],
  },
  {
    slug: "ai-website-agent-custom",
    type: "定制",
    name: "AI 建站 / 智能体定制",
    price: "¥7,999",
    oneLine: "面向已有明确需求的客户，交付能展示、能获客、能承接流程的成品。",
    fit: "适合已经有业务、预算和明确需求，想直接要 AI 网站或智能体成品的人。",
    deliverables: [
      "需求访谈：明确目标用户、业务流程、页面结构和能力边界。",
      "方案设计：给出网站或智能体的信息架构、功能清单和交付范围。",
      "落地开发：完成可运行版本，并说明后续怎么改内容和迭代。",
    ],
  },
];

const orderSteps = [
  ["01", "选产品", "不确定买哪个，先从 ¥199 咨询开始。已有明确需求，直接看课程、陪跑或定制。"],
  ["02", "私信关键词", "小红书私信产品名：AI咨询 / 豆包GEO / 小程序 / Codex / 月度陪跑 / AI定制。"],
  ["03", "确认适合", "我先判断你现在适不适合买，避免买错产品、浪费时间。"],
  ["04", "付款交付", "课程给学习入口，陪跑约首次会议，定制先锁定需求和交付范围。"],
];

const proofImages = [
  ["/slides/two-legs.jpg", "AI时代，两条腿走路"],
  ["/slides/three-barriers.jpg", "最新AI技术的三大门槛"],
  ["/slides/codex-course.jpg", "Codex最强实战课"],
  ["/slides/mini-program-result.jpg", "微信小程序真实业务结果"],
  ["/slides/geo-result.jpg", "GEO豆包优化真实业务结果"],
  ["/slides/geo-steps.jpg", "真正能落地的GEO三步"],
];

function navigate(path) {
  history.pushState(null, "", path);
  render();
  scrollTo({ top: 0, behavior: "smooth" });
}

function link(path, label, cls = "") {
  return `<a href="${path}" class="${cls}" data-route>${label}</a>`;
}

function active(path) {
  return location.pathname.includes(path) ? "nav-link on" : "nav-link";
}

function nav() {
  return `
    <nav class="nav">
      <div class="nav-inner">
        ${link("/", "小王AI课", "brand")}
        <div class="nav-links">
          ${navItems.map(([path, label]) => link(`/${path}`, label, active(path))).join("")}
        </div>
        ${link("/contact", "小红书下单", "nav-cta")}
      </div>
    </nav>
  `;
}

function serviceRows(items = products) {
  return items.map((product, index) => `
    <article class="service-row ${product.featured ? "featured" : ""}">
      <div class="service-index">${String(index + 1).padStart(2, "0")}</div>
      <div class="service-main">
        <span>${product.type}</span>
        <h3>${product.name}</h3>
        <p>${product.oneLine}</p>
      </div>
      <div class="service-side">
        <strong>${product.price}</strong>
        ${link(`/products/${product.slug}`, "查看详情", "quiet-link")}
      </div>
    </article>
  `).join("");
}

function heroVisual() {
  return `
    <div class="hero-visual" aria-label="小王AI课业务系统预览">
      <div class="folio-card top">
        <span>ONE-PERSON COMPANY</span>
        <b>每天 5 条视频<br>+ Codex 智能体</b>
      </div>
      <div class="black-panel">
        <div class="panel-head">
          <i></i><i></i><i></i>
          <span>Codex 实战台</span>
        </div>
        <code>build website / mini-program / agent</code>
        <code>record one real business problem</code>
        <code>publish → test demand → close deal</code>
      </div>
      <div class="phone-card">
        <span>今日选题</span>
        <b>我用 AI 给小老板<br>做了一个成交页</b>
        <small>不是讲概念，是展示真实解决过程。</small>
      </div>
    </div>
  `;
}

function home() {
  return `
    ${nav()}
    <main>
      <section class="hero">
        <div class="hero-copyblock">
          <p class="eyebrow">AI 落地咨询 / 课程 / 陪跑 / 定制</p>
          <h1>不吹牛逼，<br>只做能落地的<br class="mobile-break"> AI。</h1>
          <p class="lead">给普通人、小老板和个体服务者设计的一套付费产品：用 Codex 做出真实业务结果，再把解决问题的过程拍成内容，形成获客能力。</p>
          <div class="hero-actions">
            ${link("/products", "查看产品", "primary")}
            ${link("/contact", "小红书私信下单", "secondary")}
          </div>
        </div>
        ${heroVisual()}
      </section>

      <section class="section statement">
        <p class="section-kicker">THE PRINCIPLE</p>
        <h2>AI 时代，两条腿走路：<br>自媒体 + AI。</h2>
        <p>一人公司最简模型：每天 5 条视频 + 用最强智能体 Codex。不是天天讲鸡汤，不是模仿对标账号，而是拍“我今天用 AI 解决了一个什么真实问题”。</p>
      </section>

      <section class="section services-section">
        <div class="section-head">
          <p class="section-kicker">PAID OFFERS</p>
          <h2>六个产品，按你的阶段往下走。</h2>
        </div>
        <div class="service-list">
          ${serviceRows()}
        </div>
      </section>

      <section class="section two-columns">
        <div>
          <p class="section-kicker">METHOD</p>
          <h2>真正的学习路径，不是追工具，而是交付结果。</h2>
        </div>
        <div class="method-list">
          <article>
            <span>01</span>
            <h3>AI 做事</h3>
            <p>用 Codex 做网站、微信小程序、软件工具、管理系统、知识付费课程配套工具。</p>
          </article>
          <article>
            <span>02</span>
            <h3>自媒体放大</h3>
            <p>把解决真实问题的过程拍成内容。你能解决 100 个业务场景，就能沉淀 100 条真正的解决方案。</p>
          </article>
          <article>
            <span>03</span>
            <h3>集中火力</h3>
            <p>可能 10 条视频才能击中真实客户需求。击中以后，继续围绕这个需求连续输出和成交。</p>
          </article>
        </div>
      </section>

      <section class="section proof-preview">
        <div class="section-head">
          <p class="section-kicker">LIVE CLASS MATERIAL</p>
          <h2>直播课里的证据链。</h2>
        </div>
        <div class="evidence-strip">
          ${proofImages.slice(0, 4).map(([src, alt]) => `
            <figure>
              <img src="${src}" alt="${alt}" loading="lazy">
              <figcaption>${alt}</figcaption>
            </figure>
          `).join("")}
        </div>
      </section>

      <section class="section order-section">
        <div class="order-card">
          <p class="section-kicker">HOW TO ORDER</p>
          <h2>下单前，我先帮你判断适合不适合。</h2>
          <div class="order-grid">
            ${orderSteps.map(([num, title, desc]) => `
              <article>
                <b>${num}</b>
                <h3>${title}</h3>
                <p>${desc}</p>
              </article>
            `).join("")}
          </div>
          <div class="order-final">
            <span>小红书号：ws_9607</span>
            ${link("/contact", "发送关键词", "primary dark")}
          </div>
        </div>
      </section>
    </main>
  `;
}

function productsPage() {
  return `
    ${nav()}
    <main class="page">
      <header class="page-head">
        <p class="section-kicker">PAID OFFERS</p>
        <h1>产品与服务</h1>
        <p>这不是一个杂乱课程货架，而是一条从诊断、学习、实战、陪跑到定制交付的路径。用户能清楚知道自己该从哪一层开始。</p>
      </header>
      <section class="service-list page-list">
        ${serviceRows()}
      </section>
    </main>
  `;
}

function methodPage() {
  return `
    ${nav()}
    <main class="page">
      <header class="page-head wide">
        <p class="section-kicker">METHOD</p>
        <h1>一人公司 = 每天 5 条视频 + Codex 智能体</h1>
        <p>普通人/小老板，在 AI 时代用 Codex 做出真实业务结果，再把这个过程拍成内容，形成获客能力。</p>
      </header>
      <section class="formula">
        <div>
          <span>第一条腿</span>
          <h2>AI 做事</h2>
          <p>网站、小程序、软件工具、管理系统、课程配套工具，不靠空想，先做出东西。</p>
        </div>
        <div>
          <span>第二条腿</span>
          <h2>自媒体放大</h2>
          <p>不是讲鸡汤，而是拍真实业务问题的解决过程，让内容变成信任和获客入口。</p>
        </div>
      </section>
      <section class="timeline">
        <article><b>3个月</b><p>获客能力猛增。</p></article>
        <article><b>半年</b><p>AI 水平突飞猛进。</p></article>
        <article><b>一年</b><p>成为自己行业里的 AI 带头人。</p></article>
      </section>
    </main>
  `;
}

function proofPage() {
  return `
    ${nav()}
    <main class="page">
      <header class="page-head wide">
        <p class="section-kicker">PROOF</p>
        <h1>案例与直播课材料</h1>
        <p>先用 PPT 中已有的真实内容做证据位，后续可以继续替换成小红书笔记、私信反馈、成交截图和客户项目。</p>
      </header>
      <section class="evidence-grid">
        ${proofImages.map(([src, alt]) => `
          <figure>
            <img src="${src}" alt="${alt}" loading="lazy">
            <figcaption>${alt}</figcaption>
          </figure>
        `).join("")}
      </section>
    </main>
  `;
}

function contactPage() {
  return `
    ${nav()}
    <main class="page">
      <section class="contact-hero">
        <p class="section-kicker">CONTACT</p>
        <h1>想下单，直接小红书私信关键词。</h1>
        <p>如果你不知道买哪个，先发你的行业、业务、预算和现在最卡的问题。我会先判断适合不适合。</p>
      </section>
      <section class="contact-panel">
        <div>
          <span>小红书</span>
          <b>小王AI课</b>
        </div>
        <div>
          <span>小红书号</span>
          <b>ws_9607</b>
        </div>
        <div>
          <span>下单关键词</span>
          <b>AI咨询 / 豆包GEO / 小程序 / Codex / 月度陪跑 / AI定制</b>
        </div>
        <div>
          <span>建议附带</span>
          <b>行业、客单价、获客方式、当前卡点、想达成的结果</b>
        </div>
      </section>
    </main>
  `;
}

function productDetail(slug) {
  const product = products.find((item) => item.slug === slug) || products[0];
  return `
    ${nav()}
    <main class="page">
      <header class="detail-head">
        ${link("/products", "返回产品列表", "back")}
        <p class="section-kicker">${product.type}</p>
        <h1>${product.name}</h1>
        <p>${product.oneLine}</p>
        <strong>${product.price}</strong>
      </header>
      <section class="detail-layout">
        <aside>
          <span>适合谁</span>
          <p>${product.fit}</p>
          ${link("/contact", "私信确认是否适合", "primary dark")}
        </aside>
        <div class="deliverables">
          ${product.deliverables.map((item, index) => `
            <article>
              <b>${String(index + 1).padStart(2, "0")}</b>
              <p>${item}</p>
            </article>
          `).join("")}
        </div>
      </section>
      ${product.featured ? `
        <section class="section statement detail-statement">
          <p class="section-kicker">MONTHLY MENTORSHIP</p>
          <h2>半年内没结果，你来北京亦庄骂我。</h2>
          <p>核心打法很简单：每天用 Codex 解决一个真实问题，把过程拍成内容。100 个真实场景的问题，就是 100 条真正的解决方案。</p>
        </section>
      ` : ""}
    </main>
  `;
}

function render() {
  const path = location.pathname;
  let html = home();
  if (path === "/products") html = productsPage();
  if (path === "/method") html = methodPage();
  if (path === "/proof") html = proofPage();
  if (path === "/contact") html = contactPage();
  if (path.startsWith("/products/")) html = productDetail(path.split("/").pop());
  document.querySelector("#app").innerHTML = html;
  document.querySelectorAll("[data-route]").forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(anchor.getAttribute("href"));
    });
  });
}

window.addEventListener("popstate", render);
render();

import "./styles.css";

const navItems = [
  ["home", "首页"],
  ["products", "全部产品"],
  ["proof", "成功案例"],
  ["method", "学习方法"],
  ["contact", "关于我"],
];

const products = [
  {
    slug: "ai-consulting",
    icon: "◎",
    type: "诊断",
    name: "30分钟AI咨询",
    price: "¥199",
    summary: "你的业务如何用AI更快？30分钟快速诊断，给出可执行方案",
    bullets: ["业务诊断 & 机会点分析", "可执行方案 & 工具建议", "不满意可退"],
  },
  {
    slug: "doubao-geo-course",
    icon: "GEO",
    type: "认知课",
    name: "豆包GEO 7节认知小课",
    price: "¥399",
    summary: "搞懂GEO底层逻辑，让你的内容被AI推荐",
    bullets: ["7节视频课 + 讲件", "GEO实战方法论", "社群答疑"],
  },
  {
    slug: "wechat-mini-program",
    icon: "⌁",
    type: "实战课",
    name: "微信小程序上架流程",
    price: "¥599",
    summary: "从注册到上架，全流程实操，少走弯路，快速上线",
    bullets: ["注册认证", "开发部署", "提交审核 & 上架"],
  },
  {
    slug: "codex-ai-coding",
    icon: "</>",
    type: "实战课",
    name: "Codex零基础AI编程",
    price: "¥599",
    summary: "从0到1用Codex写代码，做出能用的项目",
    bullets: ["环境配置", "完成项目（5+）", "代码讲解 & 答疑"],
  },
  {
    slug: "ai-transform-mentor",
    icon: "●",
    type: "陪跑",
    name: "个体AI转型月度陪跑",
    price: "¥2699",
    tag: "热门",
    summary: "每月深度陪跑30天，帮你把想法落地，获得稳定结果",
    bullets: ["每周1次深度辅导", "作业点评 & 优化", "社群陪伴 & 资源对接"],
  },
  {
    slug: "ai-website-agent-custom",
    icon: "⌘",
    type: "定制",
    name: "AI建站/智能体定制",
    price: "¥7999",
    summary: "网站 / 小程序 / 智能体定制，按需开发，交付源代码",
    bullets: ["需求梳理", "开发交付", "售后维护（30天）"],
  },
];

const proofImages = [
  ["/slides/geo-result.jpg", "GEO实战案例"],
  ["/slides/mini-program-result.jpg", "微信小程序交付"],
  ["/slides/codex-course.jpg", "Codex代码实战"],
];

const orderSteps = [
  ["选产品", "选择适合你的产品"],
  ["私信关键词", "小红书私信发送关键词获取产品详细信息"],
  ["确认适合", "沟通你的情况，确认是否适合学习"],
  ["付款交付", "付款后立即开通，交付学习资料"],
];

function navigate(path) {
  history.pushState(null, "", path);
  render();
  scrollTo({ top: 0, behavior: "smooth" });
}

function link(path, label, cls = "") {
  return `<a href="${path}" class="${cls}" data-route>${label}</a>`;
}

function nav() {
  return `
    <header class="site-header">
      <a href="/" class="brand" data-route>
        <strong>小王AI课</strong>
        <span>不吹牛逼，只做能落地的AI</span>
      </a>
      <nav class="nav-links">
        ${navItems.map(([path, label], index) => link(path === "home" ? "/" : `/${path}`, label, `nav-link ${index === 0 && location.pathname === "/" ? "active" : ""}`)).join("")}
      </nav>
      ${link("/contact", "小红书私信下单", "header-cta")}
    </header>
  `;
}

function heroStats() {
  return `
    <div class="hero-stats">
      <div><i>♙</i><b>一人公司</b><span>每天5条视频</span></div>
      <div><i>&lt;/&gt;</i><b>Codex智能体</b><span>智你干活</span></div>
      <div><i>▥</i><b>自媒体放大</b><span>持续获客</span></div>
    </div>
  `;
}

function productRows() {
  return products.map((item, index) => `
    <article class="product-row ${item.tag ? "hot" : ""}">
      <div class="num">${String(index + 1).padStart(2, "0")}</div>
      <div class="prod-icon">${item.icon}</div>
      <div class="prod-main">
        <h3>${item.name}${item.tag ? `<em>${item.tag}</em>` : ""}</h3>
        <p>${item.summary}</p>
      </div>
      <strong>${item.price}</strong>
      ${link(`/products/${item.slug}`, "查看详情", "small-btn")}
    </article>
  `).join("");
}

function home() {
  return `
    ${nav()}
    <main>
      <section class="hero" id="home">
        <div class="hero-left">
          <h1>不吹牛逼，<br>只做能落地的AI</h1>
          <p>用 Codex 干出真实生意结果，<br>再把过程变成内容，持续获客</p>
          ${heroStats()}
          <div class="hero-actions">
            ${link("/contact", "小红书私信下单", "primary-btn")}
            ${link("/products", "查看产品", "outline-btn")}
          </div>
        </div>
        <div class="hero-media">
          <img src="/hero-device.jpg" alt="Codex和小红书内容系统">
        </div>
      </section>

      <section class="trustbar">
        <span>已帮助 1200+ 个人/小微企业落地 AI 项目</span>
        <span>交付可复用的方法与 SOP</span>
        <span>结果导向，长期陪跑</span>
        <span>不满意可沟通，确保效果</span>
      </section>

      <section class="products-section" id="products">
        <div class="section-title center">
          <h2>全部产品</h2>
          <p>每一门都是实战交付，不讲虚的</p>
        </div>
        <div class="product-table">
          ${productRows()}
        </div>
        ${link("/products", "查看全部产品 →", "more-link")}
      </section>

      <section class="method-dark" id="method">
        <p>我们的做事方法</p>
        <h2>AI时代，两条腿走路：自媒体 + AI</h2>
        <div class="method-cards">
          <article>
            <h3>AI 做事</h3>
            <p>用 AI 干出结果，降本增效</p>
            <ul>
              <li>用 Codex 写代码，搭工具</li>
              <li>用 AI 建站和做运营</li>
              <li>用智能体替你干重复活</li>
              <li>业务流程自动化</li>
            </ul>
          </article>
          <div class="method-plus">+</div>
          <article>
            <h3>自媒体放大</h3>
            <p>把过程变成内容，持续获客</p>
            <ul>
              <li>每天5条视频，矩阵发布</li>
              <li>输出真实案例，建立信任</li>
              <li>内容引导私域转化</li>
              <li>成交复购</li>
            </ul>
          </article>
          <div class="method-phone">
            <span>AI帮我<br>一个人做生意</span>
            <button>发布作品</button>
          </div>
        </div>
        <div class="formula">一人公司 = 每天5条视频 + Codex智能体<br><span>让AI成为你的合伙人，让内容成为你的业务员</span></div>
      </section>

      <section class="proof-section" id="proof">
        <div class="section-title center">
          <h2>真实案例 & 交付物</h2>
          <p>部分展示，学完能照着用</p>
        </div>
        <div class="proof-grid">
          ${proofImages.map(([src, title]) => `
            <figure>
              <img src="${src}" alt="${title}">
              <figcaption>${title}</figcaption>
            </figure>
          `).join("")}
        </div>
        ${link("/proof", "查看更多案例 →", "outline-btn proof-more")}
      </section>

      <section class="order-section">
        <div class="section-title center">
          <h2>下单流程 <small>（简单4步，快速开始）</small></h2>
        </div>
        <div class="order-flow">
          ${orderSteps.map(([title, text], index) => `
            <article>
              <i>${["▣", "✈", "●", "▰"][index]}</i>
              <h3>${title}</h3>
              <p>${text}</p>
            </article>
          `).join("<b>→</b>")}
        </div>
      </section>
    </main>
    ${footer()}
  `;
}

function productsPage() {
  return `
    ${nav()}
    <main class="page">
      <div class="section-title center">
        <h1>全部产品</h1>
        <p>从一次诊断，到课程实战、月度陪跑、项目定制，按你的阶段选择。</p>
      </div>
      <div class="product-table page-table">${productRows()}</div>
    </main>
    ${footer()}
  `;
}

function methodPage() {
  return `
    ${nav()}
    <main class="page">
      <section class="method-dark standalone">
        <p>学习方法</p>
        <h2>一人公司 = 每天5条视频 + Codex智能体</h2>
        <div class="method-cards">
          <article><h3>AI 做事</h3><p>用 Codex 做网站、小程序、软件工具、管理系统、课程配套工具。</p></article>
          <article><h3>自媒体放大</h3><p>拍“我今天用 AI 解决了一个真实问题”，形成获客能力。</p></article>
        </div>
      </section>
    </main>
    ${footer()}
  `;
}

function proofPage() {
  return `
    ${nav()}
    <main class="page">
      <div class="section-title center">
        <h1>真实案例 & 交付物</h1>
        <p>先展示直播课材料，后续继续替换成客户反馈和真实成交截图。</p>
      </div>
      <div class="proof-grid wide">
        ${proofImages.concat([["/slides/two-legs.jpg", "两条腿走路"], ["/slides/geo-steps.jpg", "GEO三步法"]]).map(([src, title]) => `
          <figure><img src="${src}" alt="${title}"><figcaption>${title}</figcaption></figure>
        `).join("")}
      </div>
    </main>
    ${footer()}
  `;
}

function contactPage() {
  return `
    ${nav()}
    <main class="page contact-page">
      <div class="contact-card">
        <p>联系我</p>
        <h1>小红书搜索：小王AI课</h1>
        <div class="contact-grid">
          <span>小红书号</span><b>ws_9607</b>
          <span>下单关键词</span><b>AI咨询 / 豆包GEO / 小程序 / Codex / 月度陪跑 / AI定制</b>
          <span>建议附带</span><b>行业、客单价、获客方式、当前卡点、想达成的结果</b>
        </div>
      </div>
    </main>
    ${footer()}
  `;
}

function productDetail(slug) {
  const item = products.find((product) => product.slug === slug) || products[0];
  return `
    ${nav()}
    <main class="page detail-page">
      <a href="/products" class="more-link" data-route>← 返回全部产品</a>
      <section class="detail-card">
        <div class="prod-icon big">${item.icon}</div>
        <h1>${item.name}</h1>
        <p>${item.summary}</p>
        <strong>${item.price}</strong>
        <ul>${item.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>
        ${link("/contact", "小红书私信确认是否适合", "primary-btn")}
      </section>
    </main>
    ${footer()}
  `;
}

function footer() {
  return `
    <footer class="footer">
      <div>
        <b>不教概念，只教方法；不做流量，只做结果。</b>
        <span>你的时间很贵，我只交付能落地的 AI 项目。</span>
      </div>
    </footer>
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

import "./styles.css";

const navItems = [
  ["sources", "信息源（免费）"],
  ["resources", "资源与选题（免费）"],
  ["products", "产品与服务（付费）"],
  ["proof", "案例与反馈"],
  ["contact", "联系我"],
];

const themes = [
  ["AI咨询", "先用30分钟把你的业务、账号、产品和AI切入点判断清楚，避免一上来乱买课。"],
  ["豆包GEO", "7节认知小课，讲明白AI搜索推荐逻辑和本地服务/高客单行业的获客机会。"],
  ["微信小程序", "零基础全套上架流程，从想法、页面、功能到提审，让用户知道怎么真正上线。"],
  ["Codex实战", "面向零基础的AI编程课，不讲概念堆叠，直接用Codex做能跑的东西。"],
  ["自媒体陪跑", "个体AI转型不只是学工具，而是把内容、产品、成交和复盘变成月度节奏。"],
  ["定制交付", "AI建站和智能体定制作为高客单服务，承接已经有明确业务需求的客户。"],
];

const freeResources = [
  {
    tag: "认知",
    title: "AI咨询前自查表",
    desc: "30分钟咨询前先想清楚：你现在有什么业务、想解决什么问题、愿意投入多少时间、AI到底要放大哪个环节。",
  },
  {
    tag: "GEO",
    title: "豆包GEO获客自查表",
    desc: "给财税、医美、教育、维修、招商等本地服务行业，用来判断自己有没有机会被豆包/AI搜索推荐。",
  },
  {
    tag: "路线",
    title: "零基础AI项目路线图",
    desc: "把微信小程序、Codex AI编程、AI建站、智能体定制拆成不同难度，帮用户判断自己该先学哪一个。",
  },
  {
    tag: "选题",
    title: "小王AI课产品选题地图",
    desc: "把你的内容导向6个产品：咨询、GEO课、小程序课、Codex课、自媒体陪跑、AI建站和智能体定制。",
  },
];

const proofImages = [
  ["/slides/two-legs.jpg", "AI时代两条腿走路"],
  ["/slides/three-barriers.jpg", "最新AI技术的三大门槛"],
  ["/slides/codex-course.jpg", "Codex最强实战课"],
  ["/slides/mini-program-result.jpg", "微信小程序真实业务结果"],
  ["/slides/geo-result.jpg", "GEO豆包优化真实业务结果"],
  ["/slides/geo-steps.jpg", "真正能落地的GEO三步"],
];

const barriers = [
  ["谷歌邮箱", "很多人不是学不会AI，而是第一步账号、邮箱、环境就卡住。"],
  ["网络能力", "工具不是不能用，是访问、配置、稳定性、资料入口没有打通。"],
  ["支付问题", "订阅、API、海外工具、充值和成本控制，是小老板真正的门槛。"],
];

const outcomes = [
  ["7-28天", "做出一个真实业务结果，而不是只听一堆概念。"],
  ["AI智能体", "把业务动作交给Codex和工具链：建站、小程序、软件、管理系统。"],
  ["自媒体", "把解决真实问题的过程拍出来，形成获客能力。"],
];

const orderSteps = [
  ["01", "选产品", "不知道买哪个，先从199咨询开始。已有明确需求，直接看课程、陪跑或定制。"],
  ["02", "私信关键词", "小红书私信产品名：AI咨询 / 豆包GEO / 小程序 / Codex / 月度陪跑 / AI定制。"],
  ["03", "确认适合", "我先判断你适不适合买，避免你买错产品、浪费时间。"],
  ["04", "付款交付", "课程进学习入口，陪跑约首次会议，定制先锁定需求和交付范围。"],
];

const products = [
  {
    slug: "ai-consulting",
    category: "咨",
    name: "30分钟AI咨询",
    tagline: "用半小时判断你现在最该做什么：学课、做GEO、上小程序、做自媒体，还是直接定制项目。",
    price: "¥199",
    badge: "低门槛诊断 · 先判断方向",
    stats: [["30分钟", "视频/语音咨询"], ["1次", "现状诊断"], ["1张", "行动建议"], ["不硬卖", "只讲适不适合"]],
    includes: [
      "判断你现在的业务/账号/技能，适合切入哪类AI机会。",
      "把你的问题拆成：认知问题、技术问题、内容问题、产品问题或获客问题。",
      "给出下一步路径：买哪门课、自学什么、先做什么Demo、是否适合定制。",
      "不适合做的方向也会直接讲清楚，避免你浪费时间和预算。",
    ],
    ideal: "适合还不确定自己该学什么、做什么、买什么的人。",
  },
  {
    slug: "doubao-geo-course",
    category: "课",
    name: "豆包GEO 7节认知小课",
    tagline: "讲明白豆包/AI搜索推荐逻辑，以及本地服务、高客单行业怎么理解GEO获客。",
    price: "¥399",
    badge: "7节 · 认知小课",
    stats: [["7节", "认知课程"], ["GEO", "核心逻辑"], ["案例", "医美/财税"], ["适合", "老板和运营"]],
    includes: [
      "什么是GEO：AI搜索和传统SEO/小红书搜索的区别。",
      "豆包为什么会推荐某个机构/品牌/服务，而不是另一个。",
      "医美、财税、本地服务这类行业的GEO机会怎么判断。",
      "看完知道自己该补内容、补页面、补问答，还是先别急着做。",
    ],
    ideal: "适合想先搞懂豆包GEO机会，但暂时不需要定制服务的人。",
  },
  {
    slug: "wechat-mini-program",
    category: "课",
    name: "零基础微信小程序全套上架流程",
    tagline: "从0开始，用AI辅助完成微信小程序的页面、功能、配置、提审和上架流程。",
    price: "¥599",
    badge: "零基础 · 全套上架流程",
    stats: [["0基础", "可学习"], ["全流程", "从开发到提审"], ["1套", "上架清单"], ["项目型", "边做边学"]],
    includes: [
      "微信小程序从注册、配置、开发工具到提审上架的完整路径。",
      "用AI辅助生成页面、功能说明、文案和基础代码。",
      "常见审核卡点、类目选择、隐私协议和上线前检查。",
      "让零基础用户真正理解“做出来”和“上架成功”之间差在哪。",
    ],
    ideal: "适合想做出第一个微信小程序，并把它作为AI项目能力证明的人。",
  },
  {
    slug: "codex-ai-coding",
    category: "课",
    name: "Codex最强实战：零基础AI编程",
    tagline: "专给不会写代码的人，用Codex从需求、页面、功能、调试到上线，做出真正能运行的项目。",
    price: "¥599",
    badge: "Codex实战 · 零基础AI编程",
    stats: [["0基础", "不要求会代码"], ["Codex", "核心工具"], ["实战", "边做项目"], ["上线", "从本地到发布"]],
    includes: [
      "Codex怎么读项目、改页面、修bug、跑测试，而不是只聊天。",
      "从一句需求拆成页面、组件、数据、样式和上线步骤。",
      "用真实项目练习：个人网站、工具页、落地页、小型应用。",
      "学会和AI协作，知道怎么提需求、验收结果、避免瞎改。",
    ],
    ideal: "适合不会编程但想用Codex做网站、小程序原型、AI工具和副业项目的人。",
  },
  {
    slug: "ai-transform-mentor",
    category: "陪",
    name: "个体AI转型自媒体月度陪跑",
    detailName: "个体AI转型<br>自媒体月度陪跑",
    tagline: "AI时代两条腿走路：用Codex做出真实业务结果，再把解决问题的过程拍成内容。",
    detailTagline: "AI时代两条腿走路：<br>用Codex做业务结果，<br>再把过程拍成内容。",
    price: "¥2,699 / 月",
    badge: "自媒体 + Codex · 月度陪跑",
    stats: [["每天5条", "真实问题视频"], ["Codex", "做业务结果"], ["100个", "真实场景"], ["3个月", "获客能力猛增"]],
    includes: [
      "第一条腿：AI做事。用Codex做网站、微信小程序、软件工具、管理系统、知识付费课程配套工具。",
      "第二条腿：自媒体放大。不是讲鸡汤，不是模仿对标账号，而是拍“我今天用AI解决了一个什么真实问题”。",
      "选题方法：你能解决100个真实业务场景，就能沉淀100条真正的解决方案，再从中击中真实客户需求。",
      "复盘打法：可能10条视频才能打中一个需求，打中以后继续集中火力攻击这个需求。",
    ],
    ideal: "适合普通人、小老板、个体服务者：想用Codex做出真实业务结果，再靠自媒体形成获客能力。",
    detail: {
      formula: "一人公司 = 每天5条视频 + 用最牛逼智能体Codex",
      formulaHtml: "一人公司<br>= 每天5条视频<br>+ 用最牛逼<br>智能体Codex",
      summary: "普通人/小老板，在AI时代用Codex智能体，做出真实业务结果，再把这个过程拍成内容，形成获客能力。",
      milestones: [
        ["3个月", "获客能力猛增"],
        ["半年", "AI水平突飞猛进"],
        ["一年", "成为自己行业的AI带头人"],
      ],
      paragraphs: [
        "回来起点：AI时代，两条腿走路，自媒体 + AI。",
        "不是天天讲鸡汤，不是模仿对标账号，而是每天拿一个真实问题开干：今天用AI解决了什么业务问题，就拍什么内容。",
        "100个真实场景的问题，就是100条真正的解决方案。你解决得越多，内容越硬，客户越准。",
      ],
    },
  },
  {
    slug: "ai-website-agent-custom",
    category: "定",
    name: "AI建站/智能体定制",
    tagline: "面向已有明确需求的客户，定制能展示、能获客、能承接流程的网站或业务智能体。",
    price: "¥7,999",
    badge: "高客单定制 · 项目交付",
    stats: [["1个", "定制项目"], ["网站", "或智能体"], ["业务", "流程梳理"], ["交付", "可运行版本"]],
    includes: [
      "需求访谈：明确目标用户、业务流程、页面结构、智能体能力边界。",
      "方案设计：给出网站/智能体的信息架构、功能清单和交付范围。",
      "落地开发：用AI辅助快速搭建页面、交互、内容和基础自动化流程。",
      "交付培训：让客户知道怎么使用、怎么改内容、怎么继续迭代。",
    ],
    ideal: "适合已经有业务、有预算、有明确需求，想直接要一个AI网站或智能体成品的人。",
  },
];

const proof = [
  ["咨询", "¥199", "先判断方向：你该学课、做自媒体，还是直接定制项目。"],
  ["GEO", "¥399", "7节认知小课，帮老板和运营看懂豆包搜索获客机会。"],
  ["小程序", "¥599", "零基础走完整套微信小程序开发、提审、上架流程。"],
  ["Codex", "¥599", "用AI编程做出能运行的页面、工具和项目原型。"],
  ["陪跑", "¥2699/月", "把账号定位、选题、产品和私域承接变成月度节奏。"],
  ["定制", "¥7999", "AI建站或智能体定制，面向明确业务需求交付成品。"],
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
          <button class="mini-btn">EN</button>
          <button class="mini-btn">DARK</button>
        </div>
      </div>
    </nav>
  `;
}

function marquee() {
  const row = [...proof, ...proof]
    .map(([name, role, quote]) => `
      <div class="ticker-item">
        <span class="avatar">${name[0]}</span>
        <span><b>${name}</b><i>·</i><em>${role}</em><i>—</i>"${quote}"</span>
      </div>
    `)
    .join("");
  return `<div class="ticker"><div class="ticker-track">${row}</div></div>`;
}

function home() {
  return `
    ${nav()}
    <main>
      <section class="hero">
        <p class="eyebrow">小王AI课 · 咨询 · 课程 · 陪跑 · 定制</p>
        <h1>不吹牛逼<br><span>只做能落地<br>的AI</span></h1>
        <p class="hero-copy">我和其他AI博主的区别：不把工具讲成玄学。这里把AI咨询、豆包GEO、微信小程序、Codex编程、自媒体陪跑和AI定制，做成价格清楚、路径清楚、结果清楚的产品。</p>
        <div class="hero-actions">
          ${link("/products", "产品与服务（付费）", "primary")}
          ${link("/resources", "免费资源和选题库", "secondary")}
        </div>
      </section>
      ${marquee()}
      <section class="section split">
        <div>
          <p class="section-kicker">FOR SMALL BUSINESS</p>
          <h2>这不是AI工具课，是小老板AI落地课</h2>
        </div>
        <div class="stack">
          <p>PPT里的核心不是“又一个AI教程”，而是：普通人和小老板怎么用AI做出真实业务结果，再把这个过程变成获客内容。</p>
          <p>你要解决的不是学习热情，而是三件事：能不能用起来，能不能做出来，能不能卖出去。</p>
        </div>
      </section>
      <section class="section">
        <p class="section-kicker">THREE BARRIERS</p>
        <h2>大多数人卡住，不是因为不努力</h2>
        <div class="theme-grid">
          ${barriers.map(([title, desc]) => `<article><h3>${title}</h3><p>${desc}</p></article>`).join("")}
        </div>
      </section>
      <section class="section">
        <p class="section-kicker">7-28 DAYS</p>
        <h2>最终目标：做出真实业务结果</h2>
        <div class="outcome-grid">
          ${outcomes.map(([title, desc]) => `<article><b>${title}</b><p>${desc}</p></article>`).join("")}
        </div>
      </section>
      <section class="section">
        <p class="section-kicker">FROM THE LIVE CLASS</p>
        <h2>直播课里的证据链</h2>
        <div class="image-grid">
          ${proofImages.map(([src, alt]) => `<figure><img src="${src}" alt="${alt}" loading="lazy"><figcaption>${alt}</figcaption></figure>`).join("")}
        </div>
      </section>
      <section class="section">
        <p class="section-kicker">REAL TOPICS</p>
        <h2>产品来自你的真实历史选题</h2>
        <div class="theme-grid">
          ${themes.map(([title, desc]) => `<article><h3>${title}</h3><p>${desc}</p></article>`).join("")}
        </div>
      </section>
      <section class="section split">
        <div>
          <p class="section-kicker">MY METHOD</p>
          <h2>先低门槛判断方向，再按能力和预算继续往下走</h2>
        </div>
        <div class="stack">
          <p>你的产品不是散的：199咨询负责筛选需求，399和599课程负责建立信任和交付基础能力，2699陪跑负责自媒体转型，7999定制负责高客单落地。</p>
          <p>所以这个站不应该只是“AI课商城”，而应该是一个清晰的产品阶梯：用户知道自己在哪一层，也知道下一步该买什么。</p>
        </div>
      </section>
      <section class="section">
        <p class="section-kicker">HOW TO ORDER</p>
        <h2>怎么下单</h2>
        <div class="order-grid">
          ${orderSteps.map(([num, title, desc]) => `<article><b>${num}</b><h3>${title}</h3><p>${desc}</p></article>`).join("")}
        </div>
        <div class="bottom-cta">
          <h2>不确定买哪个？先约30分钟AI咨询。</h2>
          <p>¥199 先判断方向；适合继续做，再进入课程、陪跑或定制。</p>
          ${link("/products/ai-consulting", "从199咨询开始", "primary")}
        </div>
      </section>
    </main>
  `;
}

function resources() {
  return `
    ${nav()}
    <main class="page">
      <header class="page-head">
        <p class="section-kicker">FREE RESOURCES</p>
        <h1>免费资源和选题库</h1>
        <p>先把能公开分享的东西给用户：认知、GEO自查、案例拆解和历史选题地图。</p>
      </header>
      <section class="card-list">
        ${freeResources.map(item => `
          <article class="resource-card">
            <span>${item.tag}</span>
            <h2>${item.title}</h2>
            <p>${item.desc}</p>
          </article>
        `).join("")}
      </section>
    </main>
  `;
}

function sources() {
  const items = ["豆包/AI搜索结果", "医美与财税GEO案例", "微信小程序上架流程", "AI建站工具链", "自动剪辑与口播工具", "个体AI转型案例"];
  return `
    ${nav()}
    <main class="page">
      <header class="page-head">
        <p class="section-kicker">SOURCES</p>
        <h1>我关注的信息源</h1>
        <p>只看能转化成案例、课程或业务结果的信息，不做工具新闻搬运。</p>
      </header>
      <section class="source-grid">
        ${items.map((item, index) => `<article><b>0${index + 1}</b><h2>${item}</h2><p>每周筛一遍：能不能变成一条笔记、一个产品、一个客户案例。</p></article>`).join("")}
      </section>
    </main>
  `;
}

function productsPage() {
  return `
    ${nav()}
    <main class="page">
      <header class="page-head wide">
        <p class="section-kicker">PAID OFFERS</p>
        <h1>产品与服务</h1>
        <p>按你的真实收费内容重排：199咨询入门，399/599课程建立能力，2699月度陪跑做自媒体转型，7999承接AI建站和智能体定制。</p>
      </header>
      <section class="order-hint">
        <b>下单建议</b>
        <p>不确定方向先买199咨询；想学具体能力买399/599课程；想做自媒体变现选2699月度陪跑；已有业务需求选7999定制。</p>
      </section>
      <section class="products">
        ${products.map(product => `
          <article class="product-card">
            <div>
              <span>${product.category}</span>
              <h2>${product.name}</h2>
              <p>${product.tagline}</p>
            </div>
            <div class="product-foot">
              <b>${product.price}</b>
              ${link(`/products/${product.slug}`, "查看详情", "text-link")}
            </div>
          </article>
        `).join("")}
      </section>
    </main>
  `;
}

function productDetail(slug) {
  const product = products.find(item => item.slug === slug) || products[0];
  return `
    ${nav()}
    <main class="page">
      <header class="detail-head">
        ${link("/products", "← 返回产品列表", "back")}
        <p><span>${product.category}</span><em>${product.badge}</em></p>
        <h1>${product.detailName || product.name}</h1>
        <h2>${product.detailTagline || product.tagline}</h2>
        <strong>${product.price}</strong>
      </header>
      <section class="stats">
        ${product.stats.map(([num, label]) => `<article><b>${num}</b><p>${label}</p></article>`).join("")}
      </section>
      ${marquee()}
      ${product.detail ? `
        <section class="section narrow">
          <p class="section-kicker">BACK TO START</p>
          <div class="formula-panel">
            <p>AI时代，两条腿走路：自媒体 + AI</p>
            <h2>${product.detail.formulaHtml || product.detail.formula}</h2>
            <strong>${product.detail.summary}</strong>
          </div>
          <div class="milestones">
            ${product.detail.milestones.map(([time, result]) => `<article><b>${time}</b><p>${result}</p></article>`).join("")}
          </div>
          <div class="stack story-stack">
            ${product.detail.paragraphs.map(paragraph => `<p>${paragraph}</p>`).join("")}
          </div>
        </section>
      ` : ""}
      <section class="section narrow">
        <p class="section-kicker">WHO IT IS FOR</p>
        <h2>${product.ideal}</h2>
      </section>
      <section class="section narrow">
        <p class="section-kicker">WHAT YOU GET</p>
        <div class="deliverables">
          ${product.includes.map((item, index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><p>${item}</p></article>`).join("")}
        </div>
      </section>
      <section class="cta">
        <h2>${product.price}</h2>
        <p>小红书私信「${product.name}」，我先判断你现在适不适合买这个产品。</p>
        <div><span>小红书：小王AI课</span><span>小红书号：ws_9607</span><span>下单前先确认适合度</span></div>
      </section>
    </main>
  `;
}

function proofPage() {
  return `
    ${nav()}
    <main class="page">
      <header class="page-head">
        <p class="section-kicker">PROOF</p>
        <h1>案例与反馈位</h1>
        <p>这里先按你的产品方向放占位内容，后续可以替换为小红书私信截图、客户案例和付款记录。</p>
      </header>
      <section class="image-grid proof-images">
        ${proofImages.map(([src, alt]) => `<figure><img src="${src}" alt="${alt}" loading="lazy"><figcaption>${alt}</figcaption></figure>`).join("")}
      </section>
      <section class="proof-grid">
        ${proof.map(([name, role, quote]) => `<article><span>${name[0]}</span><h2>${name}</h2><small>${role}</small><p>"${quote}"</p></article>`).join("")}
      </section>
    </main>
  `;
}

function contact() {
  return `
    ${nav()}
    <main class="page">
      <section class="about">
        <p class="section-kicker">ABOUT ME</p>
        <h1>我是小王AI课，专门拆普通人和小生意怎么用AI拿业务结果。</h1>
        <p>我不做“AI工具大全”。现在的付费内容分成6层：199咨询、399豆包GEO课、599微信小程序课、599 Codex实战课、2699月度陪跑、7999 AI建站/智能体定制。</p>
      </section>
      <section class="contact-card">
        <p class="section-kicker">CONTACT</p>
        <h2>联系我</h2>
        <div><b>小红书</b><span>小王AI课</span><small>私信说明你想解决的问题：AI咨询、豆包GEO、小程序、Codex编程、自媒体陪跑，还是AI定制。</small></div>
        <div><b>小红书号</b><span>ws_9607</span><small>主页可见粉丝约7199，笔记约383。</small></div>
        <div><b>下单关键词</b><span>AI咨询 / 豆包GEO / 小程序 / Codex / 月度陪跑 / AI定制</span><small>直接发关键词，我会按你的阶段判断是否适合买。</small></div>
        <div><b>适合聊什么</b><span>AI咨询 / 豆包GEO / 微信小程序 / Codex实战 / 自媒体陪跑 / AI建站和智能体</span><small>如果你已有业务，最好带着行业、客单价、获客方式和当前卡点来聊。</small></div>
      </section>
    </main>
  `;
}

function render() {
  const path = location.pathname;
  let html = home();
  if (path === "/sources") html = sources();
  if (path === "/resources") html = resources();
  if (path === "/products") html = productsPage();
  if (path.startsWith("/products/")) html = productDetail(path.split("/").pop());
  if (path === "/proof") html = proofPage();
  if (path === "/contact") html = contact();
  document.querySelector("#app").innerHTML = html;
  document.querySelectorAll("[data-route]").forEach(anchor => {
    anchor.addEventListener("click", event => {
      event.preventDefault();
      navigate(anchor.getAttribute("href"));
    });
  });
}

window.addEventListener("popstate", render);
render();

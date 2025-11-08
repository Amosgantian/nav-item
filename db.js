const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const config = require('./config');

const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const db = new sqlite3.Database(path.join(dbDir, 'nav.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_menus_order ON menus("order")`);

  // 子菜单表
  db.run(`CREATE TABLE IF NOT EXISTS sub_menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    FOREIGN KEY(parent_id) REFERENCES menus(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sub_menus_parent_id ON sub_menus(parent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sub_menus_order ON sub_menus("order")`);

  // 卡片表
  db.run(`CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_id INTEGER,
    sub_menu_id INTEGER,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    logo_url TEXT,
    custom_logo_path TEXT,
    desc TEXT,
    "order" INTEGER DEFAULT 0,
    FOREIGN KEY(menu_id) REFERENCES menus(id) ON DELETE CASCADE,
    FOREIGN KEY(sub_menu_id) REFERENCES sub_menus(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cards_menu_id ON cards(menu_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cards_sub_menu_id ON cards(sub_menu_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cards_order ON cards("order")`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

  db.run(`CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position TEXT NOT NULL,
    img TEXT NOT NULL,
    url TEXT NOT NULL
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ads_position ON ads(position)`);

  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    logo TEXT
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_friends_title ON friends(title)`);

  // 检查菜单表是否为空，若为空则插入默认菜单
  db.get('SELECT COUNT(*) as count FROM menus', (err, row) => {
    if (row && row.count === 0) {
      const defaultMenus = [
        { id: 1, name: "Home", order: 1 },
        { id: 2, name: "AI Platform", order: 2 },
        { id: 3, name: "Cloud Server", order: 3 },
        { id: 4, name: "Software", order: 5 },
        { id: 5, name: "Tools", order: 6 },
        { id: 6, name: "Mail&Domain", order: 7 },
        { id: 7, name: "Container&VPS", order: 4 },
        { id: 8, name: "Dev", order: 8 }
      ];

      const stmt = db.prepare('INSERT INTO menus (name, "order") VALUES (?, ?)');
      defaultMenus.forEach(menu => stmt.run(menu.name, menu.order));

      stmt.finalize(() => {
        console.log('菜单插入完成，开始插入默认子菜单和卡片...');
        insertDefaultSubMenusAndCards();
      });
    }
  });

  function insertDefaultSubMenusAndCards() {
    db.all('SELECT * FROM menus ORDER BY "order"', (err, menus) => {
      if (err) {
        console.error('获取菜单失败:', err);
        return;
      }

      if (!menus || menus.length === 0) {
        console.log('未找到任何菜单');
        return;
      }

      console.log('找到菜单数量:', menus.length);
      menus.forEach(menu => console.log(`菜单: ${menu.name} (ID: ${menu.id})`));

      const menuMap = {};
      menus.forEach(m => { menuMap[m.name] = m.id; });
      console.log('菜单映射:', menuMap);

      // ==================== 子菜单 ====================
      const subMenus = [
        { id: 4,  parentMenu: "Software",      name: "Proxy",       order: 1 },
        { id: 5,  parentMenu: "Software",      name: "Macos",       order: 2 },
        { id: 9,  parentMenu: "Container&VPS", name: "Game Server", order: 1 },
        { id: 10, parentMenu: "Tools",         name: "Free SMS",    order: 1 },
        { id: 11, parentMenu: "Mail&Domain",   name: "Domain",      order: 1 },
        { id: 3,  parentMenu: "Dev",           name: "Dev Tools",   order: 1 } // 修复缺失的 Dev Tools
      ];

      const subMenuStmt = db.prepare('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)');
      let subMenuInsertCount = 0;
      const subMenuMap = {};

      subMenus.forEach(subMenu => {
        const parentId = menuMap[subMenu.parentMenu];
        if (parentId) {
          subMenuStmt.run(parentId, subMenu.name, subMenu.order, function (err) {
            if (err) {
              console.error(`插入子菜单失败 [${subMenu.parentMenu}] ${subMenu.name}:`, err);
            } else {
              subMenuInsertCount++;
              subMenuMap[`${subMenu.parentMenu}_${subMenu.name}`] = this.lastID;
              console.log(`成功插入子菜单 [${subMenu.parentMenu}] ${subMenu.name} (ID: ${this.lastID})`);
            }
          });
        } else {
          console.warn(`未找到父菜单: ${subMenu.parentMenu}`);
        }
      });

      subMenuStmt.finalize(() => {
        console.log(`所有子菜单插入完成，总计: ${subMenuInsertCount} 个子菜单`);

        // ==================== 卡片 ====================
        const cards = [
          { id: 1,   menu: "Home", title: "Backend", url: "https://nav.amossweet.ggff.net/admin", logo_url: "https://aomega-yahai.serv00.net/wp-content/uploads/2025/10/backendicon.jpg", desc: "信息导航管理系统", order: 1 },
          { id: 2,   menu: "Home", title: "Youtube", url: "https://www.youtube.com", logo_url: "https://img.icons8.com/ios-filled/100/ff1d06/youtube-play.png", desc: "全球最大的视频社区", order: 10 },
          { id: 3,   menu: "Home", title: "Gmail", url: "https://mail.google.com", logo_url: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico", desc: "", order: 11 },
          { id: 4,   menu: "Home", title: "GitHub", url: "https://github.com", logo_url: "", desc: "全球最大的代码托管平台", order: 3 },
          { id: 5,   menu: "Home", title: "ip.sb", url: "https://ip.sb", logo_url: "", desc: "ip地址查询", order: 16 },
          { id: 6,   menu: "Home", title: "Cloudflare", url: "https://dash.cloudflare.com", logo_url: "", desc: "全球最大的cdn服务商", order: 2 },
          { id: 7,   menu: "Home", title: "域名&邮箱&Code", url: "https://cs.a.3.e.f.0.d.0.0.1.0.a.2.ip6.arpa/", logo_url: "https://aomega-yahai.serv00.net/wp-content/uploads/2025/10/domain_account.webp", desc: "账号&笔记信息", order: 4 },
          { id: 8,   menu: "Home", title: "Huggingface", url: "https://huggingface.co", logo_url: "", desc: "全球最大的开源模型托管平台", order: 22 },
          { id: 9,   menu: "Home", title: "ITDOG - 在线ping", url: "https://www.itdog.cn/tcping", logo_url: "", desc: "在线tcping", order: 12 },
          { id: 10,  menu: "Home", title: "Ping0", url: "https://ping0.cc", logo_url: "", desc: "ip地址查询", order: 13 },
          { id: 11,  menu: "Home", title: "浏览器指纹", url: "https://www.browserscan.net/zh", logo_url: "", desc: "浏览器指纹查询", order: 18 },
          { id: 12,  menu: "Home", title: "CF_VPS面板", url: "https://monitor.yahaibiotech.dpdns.org/", logo_url: "https://monitor.yahaibiotech.dpdns.org/favicon.svg", desc: "cloudflare面板", order: 9 },
          { id: 13,  menu: "Home", title: "Api测试", url: "https://hoppscotch.io", logo_url: "", desc: "在线api测试工具", order: 17 },
          { id: 14,  menu: "Home", title: "域名检查", url: "https://who.cx", logo_url: "", desc: "域名可用性查询", order: 14 },
          { id: 15,  menu: "Home", title: "域名比价", url: "https://www.whois.com", logo_url: "", desc: "域名价格比较", order: 15 },
          { id: 16,  menu: "Home", title: "NodeSeek", url: "https://www.nodeseek.com", logo_url: "https://www.nodeseek.com/static/image/favicon/favicon-32x32.png", desc: "主机论坛", order: 21 },
          { id: 17,  menu: "Home", title: "Linux do", url: "https://linux.do", logo_url: "https://linux.do/uploads/default/optimized/3X/9/d/9dd49731091ce8656e94433a26a3ef36062b3994_2_32x32.png", desc: "新的理想型社区", order: 19 },
          { id: 18,  menu: "Home", title: "在线音乐", url: "https://music.amossweet.ggff.net/", logo_url: "https://p3.music.126.net/tBTNafgjNnTL1KlZMt7lVA==/18885211718935735.jpg", desc: "在线音乐Solara", order: 8 },
          { id: 19,  menu: "Home", title: "在线电影", url: "https://moonvt.solohot.dpdns.org", logo_url: "https://img.icons8.com/color/240/cinema---v1.png", desc: "在线电影", order: 7 },
          { id: 20,  menu: "Home", title: "Nodeloc Forum", url: "https://www.nodeloc.com/", logo_url: "https://s.rmimg.com/optimized/1X/660236e67b776cefea8b2df2276659af2f4eda2a_2_32x32.png", desc: "Nodeloc论坛", order: 20 },
          { id: 21,  menu: "Home", title: "订阅转换", url: "https://linksub.yahaibiology.dpdns.org/", logo_url: "https://img.icons8.com/color/96/link--v1.png", desc: "好用的订阅转换工具", order: 6 },
          { id: 22,  menu: "Home", title: "webssh", url: "https://ssh.eooce.com", logo_url: "https://img.icons8.com/fluency/240/ssh.png", desc: "最好用的webssh终端管理工具", order: 23 },
          { id: 23,  menu: "Home", title: "Nodes infor", url: "https://nd.2.8.e.f.0.d.0.0.1.0.a.2.ip6.arpa/", logo_url: "https://img.icons8.com/nolan/256/document.png", desc: "Personal nodes", order: 5 },
          { id: 24,  menu: "Home", title: "真实地址生成", url: "https://address.nnuu.nyc.mn", logo_url: "https://static11.meiguodizhi.com/favicon.ico", desc: "基于当前ip生成真实的地址", order: 24 },
          { id: 25,  menu: "AI Platform", title: "ChatGPT", url: "https://chat.openai.com", logo_url: "https://cdn.oaistatic.com/assets/favicon-180x180-od45eci6.webp", desc: "OpenAI官方AI对话", order: 1 },
          { id: 26,  menu: "AI Platform", title: "Deepseek", url: "https://www.deepseek.com", logo_url: "https://cdn.deepseek.com/chat/icon.png", desc: "Deepseek AI搜索", order: 4 },
          { id: 27,  menu: "AI Platform", title: "Claude", url: "https://claude.ai", logo_url: "https://img.icons8.com/fluency/240/claude-ai.png", desc: "Anthropic Claude AI", order: 2 },
          { id: 28,  menu: "AI Platform", title: "Gemini", url: "https://gemini.google.com", logo_url: "https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg", desc: "Google Gemini大模型", order: 3 },
          { id: 29,  menu: "AI Platform", title: "阿里千问", url: "https://chat.qwenlm.ai", logo_url: "https://g.alicdn.com/qwenweb/qwen-ai-fe/0.0.11/favicon.ico", desc: "阿里云千问大模型", order: 6 },
          { id: 30,  menu: "AI Platform", title: "Kimi", url: "https://www.kimi.com", logo_url: "", desc: "月之暗面Moonshot AI", order: 5 },
          { id: 64,  menu: "AI Platform", title: "问小白", url: "https://www.wenxiaobai.com/", logo_url: "https://wy-static.wenxiaobai.com/wenxiaobai-web/production/3.15.1/_next/static/media/new_favicon.6d31cfe4.png", desc: "Deepseek第三方平台", order: 7 },
          { id: 65,  menu: "AI Platform", title: "Genspark", url: "https://www.genspark.ai/agents?type=moa_chat", logo_url: "https://www.genspark.ai/favicon.ico", desc: null, order: 8 },
          { id: 66,  menu: "AI Platform", title: "AkashChat", url: "https://chat.akash.network/", logo_url: "https://chat.akash.network/favicon.ico", desc: null, order: 9 },
          { id: 67,  menu: "AI Platform", title: "V0", url: "https://v0.app/chat", logo_url: "https://v0.app/assets/icon-light-32x32.png", desc: "Vercel旗下前端AI编程工具", order: 10 },
          { id: 68,  menu: "AI Platform", title: "Same", url: "https://same.new/", logo_url: "https://same.new/faviconavicon.svg", desc: "AI快速仿站", order: 11 },
          { id: 69,  menu: "AI Platform", title: "Haisnap", url: "https://www.haisnap.com/", logo_url: "https://www.haisnap.com/favicon.ico", desc: "AI零代码应用平台", order: 12 },
          { id: 70,  menu: "AI Platform", title: "Readdy", url: "https://readdy.ai/zh", logo_url: "https://readdy.ai/site-static/favicon/favicon.ico", desc: "网站构建", order: 13 },
          { id: 72,  menu: "AI Platform", title: "Openrouter", url: "https://openrouter.ai/", logo_url: "https://openrouter.ai/favicon.ico", desc: "Interface for LLMs", order: 14 },
          { id: 73,  menu: "AI Platform", title: "Manus", url: "https://manus.im/", logo_url: "https://manus.im/favicon.ico", desc: "全场景AI", order: 15 },
          { id: 75,  menu: "AI Platform", title: "Grok", url: "https://grok.com/", logo_url: "https://grok.com/images/favicon-light.png", desc: "马斯克AI", order: 3 },
          { id: 76,  menu: "AI Platform", title: "Copilot", url: "https://copilot.microsoft.com/", logo_url: "https://copilot.microsoft.com/static/cmc/favicon.svg", desc: "微软旗下AI", order: 3 },
          { id: 77,  menu: "AI Platform", title: "豆包", url: "https://www.doubao.com/chat/", logo_url: "https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/web/logo-icon.png", desc: "字节跳动旗下AI", order: 6 },
          { id: 78,  menu: "AI Platform", title: "文心一言", url: "https://yiyan.baidu.com/", logo_url: "https://eb-static.cdn.bcebos.com/logo/favicon.ico", desc: "百度旗下AI", order: 7 },
          { id: 79,  menu: "AI Platform", title: "Jules", url: "https://jules.google.com/", logo_url: "https://www.gstatic.com/labs-code/code-app/favicon-48x48.png", desc: "Google旗下管理Github项目AI", order: 16 },
          { id: 80,  menu: "AI Platform", title: "Sillicon Flow", url: "https://account.siliconflow.cn/", logo_url: "https://account.siliconflow.cn/logo.svg", desc: "免费大模型API平台", order: 17 },
          { id: 81,  menu: "AI Platform", title: "Kilo Code", url: "https://kilocode.ai/", logo_url: "https://kilocode.ai/favicon.ico", desc: "亚马逊旗下AI编程工具", order: 18 },
          { id: 82,  menu: "AI Platform", title: "Cursor", url: "https://cursor.com/", logo_url: "https://cursor.com/marketing-static/favicon-light.svg", desc: "AI变成工具", order: 19 },
          { id: 83,  menu: "AI Platform", title: "AI换脸", url: "https://imgai.ai/", logo_url: "https://imgai.ai/imgai.svg", desc: "一键AI图像处理", order: 20 },
          { id: 84,  menu: "AI Platform", title: "Aippt", url: "https://www.aippt.cn/", logo_url: "https://www.aippt.cn/_nuxt/logo_dark.BU64bLWp.svg", desc: "AI生成PPT", order: 21 },
          { id: 85,  menu: "AI Platform", title: "AI照片修复", url: "https://picwish.cn/photo-enhancer", logo_url: "https://qncdn.aoscdn.com/astro/picwish/_astro/favicon@30w.61721eae.png", desc: "照片修复", order: 22 },
          { id: 86,  menu: "AI Platform", title: "Bolt", url: "https://bolt.new/", logo_url: "https://bolt.new/static/favicon.svg", desc: "AI生成前端", order: 23 },
          { id: 87,  menu: "AI Platform", title: "Llamacoder", url: "https://llamacoder.together.ai/", logo_url: "https://llamacoder.together.ai/favicon.ico", desc: "AI生成app", order: 24 },
          { id: 88,  menu: "AI Platform", title: "Codia", url: "https://codia.ai/", logo_url: "https://codia.ai/favicon.ico", desc: "AI代码生成", order: 25 },
          { id: 89,  menu: "AI Platform", title: "Perplexity", url: "https://www.perplexity.ai/", logo_url: "", desc: null, order: 26 },
          { id: 35,  menu: "Cloud Server", title: "阿里云", url: "https://www.aliyun.com", logo_url: "https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico", desc: "阿里云官网", order: 0 },
          { id: 36,  menu: "Cloud Server", title: "腾讯云", url: "https://cloud.tencent.com", logo_url: "", desc: "腾讯云官网", order: 0 },
          { id: 37,  menu: "Cloud Server", title: "甲骨文云", url: "https://cloud.oracle.com", logo_url: "", desc: "Oracle Cloud", order: 0 },
          { id: 38,  menu: "Cloud Server", title: "亚马逊云", url: "https://aws.amazon.com", logo_url: "https://img.icons8.com/color/144/amazon-web-services.png", desc: "Amazon AWS", order: 0 },
          { id: 39,  menu: "Cloud Server", title: "DigitalOcean", url: "https://www.digitalocean.com", logo_url: "https://www.digitalocean.com/_next/static/media/apple-touch-icon.d7edaa01.png", desc: "DigitalOcean VPS", order: 0 },
          { id: 40,  menu: "Cloud Server", title: "Vultr", url: "https://www.vultr.com", logo_url: "", desc: "Vultr VPS", order: 0 },
          { id: 90,  menu: "Cloud Server", title: "Google云", url: "https://cloud.google.com/", logo_url: "https://www.gstatic.com/cgc/favicon.ico", desc: "Google提供3个月免费云", order: 7 },
          { id: 91,  menu: "Cloud Server", title: "Azure", url: "https://azure.microsoft.com/", logo_url: "https://azure.microsoft.com/favicon.ico?v2", desc: "微软提供1年免费云", order: 7 },
          { id: 92,  menu: "Cloud Server", title: "Lindoe", url: "https://www.linode.com/", logo_url: "https://assets.linode.com/icons/favicon.ico", desc: "免费2个月（易封）", order: 7 },
          { id: 93,  menu: "Cloud Server", title: "Dartnode", url: "https://dartnode.com/", logo_url: "https://dartnode.com/assets/dash/images/brand/favicon2.png", desc: "开源可申永久免费", order: 0 },
          { id: 94,  menu: "Cloud Server", title: "Cloudcone", url: "https://app.cloudcone.com/", logo_url: "https://app.cloudcone.com/assets/img/favicon.png", desc: "每年$10", order: 10 },
          { id: 95,  menu: "Cloud Server", title: "Dmit", url: "https://www.dmit.io/", logo_url: "https://www.dmit.io/templates/dmit_theme_2020/dmit/homepage/assets/images/partner/retn.svg", desc: "优质VPS线路", order: 9 },
          { id: 96,  menu: "Cloud Server", title: "Bandwagonhost", url: "https://bandwagonhost.com/", logo_url: "https://bandwagonhost.com/templates/organicbandwagon/images/logo4.png", desc: "CN2-GIA优质路线", order: 9 },
          { id: 97,  menu: "Cloud Server", title: "Myracknerd", url: "https://my.racknerd.com/", logo_url: "https://my.racknerd.com/templates/racknerdv851/files/favicon.png", desc: "每年$10", order: 10 },
          { id: 98,  menu: "Cloud Server", title: "Atlantic", url: "https://cloud.atlantic.net/", logo_url: "https://cloud.atlantic.net/images/rs/82421f550021c450a30c54d2faad4fce.png", desc: "免费一年（易封）", order: 7 },
          { id: 99,  menu: "Cloud Server", title: "Lightnode", url: "https://www.lightnode.com/", logo_url: "https://www.lightnode.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fheader-logo.e778fe1e.png&w=1080&q=75", desc: "冷门区域", order: 0 },
          { id: 100, menu: "Cloud Server", title: "Ihosting", url: "https://ishosting.com/", logo_url: "https://ishosting.com/meta/landing/safari-pinned-tab.svg", desc: "多区域选择", order: 0 },
          { id: 101, menu: "Cloud Server", title: "Diylink", url: "https://console.diylink.net/", logo_url: "https://console.diylink.net/favicon.ico", desc: "套壳google和AWS的vps", order: 0 },
          { id: 102, menu: "Cloud Server", title: "IBM", url: "https://linuxone.cloud.marist.edu/", logo_url: "https://linuxone.cloud.marist.edu/resources/images/linuxonelogo03.png", desc: "免费4个月（需住宅IP注册）", order: 0 },
          { id: 103, menu: "Cloud Server", title: "Sharon", url: "https://whmcs.sharon.io/", logo_url: "https://whmcs.sharon.io/templates/lagom2/assets/img/favicons/favicon.ico", desc: "3网优质路线", order: 0 },
          { id: 104, menu: "Cloud Server", title: "Alicenetworks", url: "https://alicenetworks.net/", logo_url: "https://console.alice.ws/icon.png", desc: null, order: 0 },
          { id: 105, menu: "Cloud Server", title: "Yxvm", url: "https://yxvm.com/", logo_url: "https://yxvm.com/assets/img/logo.png", desc: null, order: 0 },
          { id: 106, menu: "Cloud Server", title: "Cloudforest", url: "https://cloud.cloudforest.ro/", logo_url: "", desc: "Romania free 3 months vps", order: 0 },
          { id: 107, menu: "Cloud Server", title: "Huawei Cloud", url: "https://www.huaweicloud.com/", logo_url: "https://www.huaweicloud.com/favicon.ico", desc: "free developer vps", order: 0 },
          { id: 41,  menu: "Software", title: "Hellowindows", url: "https://hellowindows.cn", logo_url: "https://hellowindows.cn/logo-s.png", desc: "windows系统及office下载", order: 0 },
          { id: 42,  menu: "Software", title: "奇迹秀", url: "https://www.qijishow.com/down", logo_url: "https://www.qijishow.com/img/ico.ico", desc: "设计师的百宝箱", order: 0 },
          { id: 43,  menu: "Software", title: "易破解", url: "https://www.ypojie.com", logo_url: "https://www.ypojie.com/favicon.ico", desc: "精品windows软件", order: 0 },
          { id: 44,  menu: "Software", title: "软件先锋", url: "https://topcracked.com", logo_url: "https://cdn.mac89.com/win_macxf_node/static/favicon.ico", desc: "精品windows软件", order: 0 },
          { id: 45,  menu: "Software", title: "Macwk", url: "https://www.macwk.com", logo_url: "https://www.macwk.com/favicon-32x32.ico", desc: "精品Mac软件", order: 0 },
          { id: 46,  menu: "Software", title: "Macsc", url: "https://mac.macsc.com", logo_url: "https://cdn.mac89.com/macsc_node/static/favicon.ico", desc: "", order: 0 },
          { id: 47,  menu: "Tools", title: "JSON工具", url: "https://www.json.cn", logo_url: "https://img.icons8.com/nolan/128/json.png", desc: "JSON格式化/校验", order: 0 },
          { id: 48,  menu: "Tools", title: "base64工具", url: "https://www.qqxiuzi.cn/bianma/base64.htm", logo_url: "https://cdn.base64decode.org/assets/images/b64-180.webp", desc: "在线base64编码解码", order: 0 },
          { id: 49,  menu: "Tools", title: "二维码生成", url: "https://qrcode.yahaibio.qzz.io ", logo_url: "https://img.icons8.com/fluency/96/qr-code.png", desc: "自建二维码生成工具", order: 0 },
          { id: 50,  menu: "Tools", title: "JS混淆", url: "https://obfuscator.io", logo_url: "https://img.icons8.com/color/240/javascript--v1.png", desc: "在线Javascript代码混淆", order: 0 },
          { id: 51,  menu: "Tools", title: "Python混淆", url: "https://freecodingtools.org/tools/obfuscator/python", logo_url: "https://img.icons8.com/color/240/python--v1.png", desc: "在线python代码混淆", order: 0 },
          { id: 52,  menu: "Tools", title: "Remove.photos", url: "https://remove.photos/zh-cn", logo_url: "https://img.icons8.com/doodle/192/picture.png", desc: "一键抠图", order: 0 },
          { id: 125, menu: "Tools", title: "Selected IP subscription ", url: "https://autosub.yahai.nyc.mn/", logo_url: "", desc: "better selected IP for subscription of CF", order: 0 },
          { id: 126, menu: "Tools", title: "Edge Subsription Converter", url: "https://subegde.yahai.nyc.mn/", logo_url: "", desc: null, order: 0 },
          { id: 127, menu: "Tools", title: "Subscription Converter online", url: "https://linksub.yahaibiology.dpdns.org/", logo_url: "", desc: "minimal configuration is better ", order: 0 },
          { id: 55,  menu: "Mail&Domain", title: "Gmail", url: "https://mail.google.com", logo_url: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico", desc: "Google邮箱", order: 0 },
          { id: 56,  menu: "Mail876&Domain", title: "Outlook", url: "https://outlook.live.com", logo_url: "https://img.icons8.com/color/256/ms-outlook.png", desc: "微软Outlook邮箱", order: 0 },
          { id: 57,  menu: "Mail&Domain", title: "Proton Mail", url: "https://account.proton.me", logo_url: "https://account.proton.me/assets/apple-touch-icon-120x120.png", desc: "安全加密邮箱", order: 0 },
          { id: 58,  menu: "Mail&Domain", title: "QQ邮箱", url: "https://mail.qq.com", logo_url: "https://mail.qq.com/zh_CN/htmledition/images/favicon/qqmail_favicon_96h.png", desc: "腾讯QQ邮箱", order: 0 },
          { id: 59,  menu: "Mail&Domain", title: "雅虎邮箱", url: "https://mail.yahoo.com", logo_url: "https://img.icons8.com/color/240/yahoo--v2.png", desc: "雅虎邮箱", order: 0 },
          { id: 60,  menu: "Mail&Domain", title: "10分钟临时邮箱", url: "https://linshiyouxiang.net", logo_url: "https://linshiyouxiang.net/static/index/zh/images/favicon.ico", desc: "10分钟临时邮箱", order: 0 },
          { id: 124, menu: "Mail&Domain", title: "Temporary EDU Email", url: "https://tempmail.edu.kg/", logo_url: "", desc: null, order: 0 },
          { id: 61,  menu: "Container&VPS", title: "serv00_S10", url: "https://panel10.serv00.com/", logo_url: "https://panel10.serv00.com/static/svg/serv00/favicon.svg", desc: "S10", order: 0 },
          { id: 62,  menu: "Container&VPS", title: "serv00_S7", url: "https://panel7.serv00.com/", logo_url: "https://panel7.serv00.com/static/svg/serv00/favicon.svg", desc: "S7", order: 0 },
          { id: 63,  menu: "Container&VPS", title: "Serv00官网", url: "https://www.serv00.com/", logo_url: "https://www.serv00.com/wp-content/uploads/2025/05/cropped-favicon-1-32x32.png", desc: "Official Website", order: 0 },
          { id: 108, menu: "Container&VPS", title: "Koyeb", url: "https://app.koyeb.com/", logo_url: "https://www.koyeb.com/static/images/illustrations/og/koyeb-home.png", desc: "free container(clean IP, no credit card)", order: 1 },
          { id: 109, menu: "Container&VPS", title: "Render", url: "https://dashboard.render.com/", logo_url: "https://dashboard.render.com/favicon-light.png", desc: "free container(clean IP, no credit card)", order: 1 },
          { id: 110, menu: "Container&VPS", title: "Fly", url: "https://fly.io/", logo_url: "https://fly.io/phx/ui/images/favicon/favicon-595d1312b35dfe32838befdf8505515e.ico?vsn=d", desc: "free container(need credit card)", order: 2 },
          { id: 111, menu: "Container&VPS", title: "Choreo", url: "https://console.choreo.dev/", logo_url: "https://console.choreo.dev/favicon.ico", desc: "free container(no credit card)", order: 2 },
          { id: 112, menu: "Container&VPS", title: "Railway", url: "https://railway.com/", logo_url: "https://railway.com/apple-touch-icon.png", desc: "free container(one moths, clean IP, no credit card, after expired, delete account and register again)", order: 3 },
          { id: 113, menu: "Container&VPS", title: "Galaxycloud", url: "https://beta.galaxycloud.app/", logo_url: "https://beta.galaxycloud.app/favicon.ico?v2", desc: "free container(no credit card)", order: 2 },
          { id: 114, menu: "Container&VPS", title: "Azure", url: "https://azure.microsoft.com/en-us/pricing/offers/ms-azr-0144p", logo_url: "https://azure.microsoft.com/favicon.ico?v2", desc: "free container(register 10 containersthrough az200 or edu email)", order: 2 },
          { id: 123, menu: "Container&VPS", title: "Wispbyte", url: "https://wispbyte.com/", logo_url: "https://wispbyte.com/assets/wispbyte_blue_nobg.webp", desc: "Romania free container", order: 0 },
          { id: 132, menu: "Dev", title: "Navigation Website", url: "https://nav.yahaibio.qzz.io/", logo_url: "", desc: "Deployed on Cloudflare", order: 0 },

          // ==================== 子菜单卡片 ====================
          { id: 31, subMenu: "Proxy", title: "ChatGPT", url: "https://chat.openai.com", logo_url: "https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico", desc: "OpenAI官方AI对话", order: 0 },
          { id: 32, subMenu: "Proxy", title: "Deepseek", url: "https://www.deepseek.com", logo_url: "https://cdn.deepseek.com/chat/icon.png", desc: "Deepseek AI搜索", order: 0 },
          { id: 33, subMenu: "Macos", title: "ChatGPT", url: "https://chat.openai.com", logo_url: "https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico", desc: "OpenAI官方AI对话", order: 0 },
          { id: 34, subMenu: "Macos", title: "Deepseek", url: "https://www.deepseek.com", logo_url: "https://cdn.deepseek.com/chat/icon.png", desc: "Deepseek AI搜索", order: 0 },
          { id: 53, subMenu: "Dev Tools", title: "Uiverse", url: "https://uiverse.io/elements", logo_url: "https://img.icons8.com/fluency/96/web-design.png", desc: "CSS动画和设计元素", order: 0 },
          { id: 54, subMenu: "Dev Tools", title: "Icons8", url: "https://igoutu.cn/icons", logo_url: "https://maxst.icons8.com/vue-static/landings/primary-landings/favs/icons8_fav_32×32.png", desc: "免费图标和设计资源", order: 0 },
          { id: 115, subMenu: "Proxy", title: "v2rayN", url: "https://v2rayn.2dust.link/", logo_url: "https://aomega-yahai.serv00.net/wp-content/uploads/2025/10/v2rayN.png", desc: "最受欢迎的（支持多平台）", order: 0 },
          { id: 116, subMenu: "Proxy", title: "Mihomo Party", url: "https://clashparty.org/", logo_url: "https://clashparty.org/logo.png", desc: "Mihomo内核最受欢迎", order: 0 },
          { id: 117, subMenu: "Proxy", title: "GUI.for.SingBox", url: "https://github.com/GUI-for-Cores/GUI.for.SingBox/releases/latest", logo_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAADACAMAAAB/Pny7...（太长省略）", desc: "第三方开源singbox代理工具", order: 0 },
          { id: 118, subMenu: "Proxy", title: "FlClash", url: "https://github.com/chen08209/FlClash/releases/latest", logo_url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/...（太长省略）", desc: "Clash系列高人气", order: 0 },
          { id: 119, subMenu: "Proxy", title: "Karing", url: "https://karing.app/download/", logo_url: "https://karing.app/img/logo.png", desc: "新一代适配多平台", order: 0 },
          { id: 120, subMenu: "Proxy", title: "Nekobox", url: "https://nekobox.tools/nekoray/", logo_url: "https://nekobox.tools/wp-content/uploads/2023/12/favicon-55x55.png", desc: "Windows版本已停维，谨慎使用", order: 0 },
          { id: 121, subMenu: "Proxy", title: "FlyClash", url: "https://github.com/GtxFury/FlyClash/releases/latest", logo_url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/...（太长省略）", desc: "Mihomo内核新一代", order: 0 },
          { id: 122, subMenu: "Proxy", title: "ClashBox", url: "https://github.com/xiaobaigroup/ClashBox", logo_url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/...（太长省略）", desc: "HarmonyOs NEXT代理app", order: 0 },
          { id: 129, subMenu: "Proxy", title: "Mihomo Alpha with Smart Group", url: "https://github.com/vernesong/mihomo/releases", logo_url: "", desc: "Openclash core clash_meta", order: 0 },
          { id: 128, subMenu: "Domain", title: "Netlib", url: "https://www.netlib.re/", logo_url: "https://aomega-yahai.serv00.net/wp-content/uploads/2025/10/domain.png", desc: "Free domain delegated to cloudflare, without reverse DNS", order: 0 },
          { id: 130, subMenu: "Domain", title: "autologin netlibre one", url: "https://autologin.sghmc.netlib.re", logo_url: "", desc: "No login for half an year, domain and account will be deleted", order: 0 },
          { id: 131, subMenu: "Domain", title: "autologin netlibre two", url: "https://monitor-netlib-re-amosgantian.menghunke.workers.dev", logo_url: "", desc: "No login for half an year, domain and account will be deleted", order: 0 }
        ];

        const cardStmt = db.prepare('INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, desc, "order") VALUES (?, ?, ?, ?, ?, ?, ?)');
        let cardInsertCount = 0;

        cards.forEach(card => {
          if (card.subMenu) {
            let subMenuId = null;
            for (const [key, id] of Object.entries(subMenuMap)) {
              if (key.endsWith(`_${card.subMenu}`)) {
                subMenuId = id;
                break;
              }
            }
            if (subMenuId) {
              cardStmt.run(null, subMenuId, card.title, card.url, card.logo_url, card.desc, card.order || 0, function (err) {
                if (!err) {
                  cardInsertCount++;
                  console.log(`成功插入子菜单卡片 [${card.subMenu}] ${card.title}`);
                }
              });
            } else {
              console.warn(`未找到子菜单: ${card.subMenu}`);
            }
          } else if (card.menu && menuMap[card.menu]) {
            cardStmt.run(menuMap[card.menu], null, card.title, card.url, card.logo_url, card.desc, card.order || 0, function (err) {
              if (!err) {
                cardInsertCount++;
                console.log(`成功插入卡片 [${card.menu}] ${card.title}`);
              }
            });
          } else {
            console.warn(`未找到菜单: ${card.menu}`);
          }
        });

        cardStmt.finalize(() => {
          console.log(`所有卡片插入完成，总计: ${cardInsertCount} 张卡片`);
        });
      });
    });
  }

  // 默认管理员
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (row && row.count === 0) {
      const passwordHash = bcrypt.hashSync(config.admin.password, 10);
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [config.admin.username, passwordHash]);
    }
  });

  // 默认友情链接
  db.get('SELECT COUNT(*) as count FROM friends', (err, row) => {
    if (row && row.count === 0) {
      const defaultFriends = [
        { title: "Noodseek图床", url: "https://www.nodeimage.com", logo: "https://www.nodeseek.com/static/image/favicon/favicon-32x32.png" },
        { title: "IP6.ARPA域名自动添加SSL证书", url: "https://ssl.1.2.e.f.0.d.0.0.1.0.a.2.ip6.arpa/", logo: "https://fontawesome.com/favicon.ico" },
        { title: "老王导航", url: "https://nav.eooce.com/", logo: "" },
        { title: "Serv00 Status", url: "https://status.eooce.com/", logo: "https://www.serv00.com/wp-content/uploads/2025/05/cropped-favicon-1-32x32.png" },
        { title: "Amos博客", url: "https://blog.amos.ip-ddns.com/", logo: "https://blog.amos.ip-ddns.com/img/amoz_avatar.png" }
      ];
      const stmt = db.prepare('INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)');
      defaultFriends.forEach(f => stmt.run(f.title, f.url, f.logo));
      stmt.finalize();
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN last_login_time TEXT`, [], () => {});
  db.run(`ALTER TABLE users ADD COLUMN last_login_ip TEXT`, [], () => {});
});

module.exports = db;

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
  
  // 添加子菜单表
  db.run(`CREATE TABLE IF NOT EXISTS sub_menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    FOREIGN KEY(parent_id) REFERENCES menus(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sub_menus_parent_id ON sub_menus(parent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sub_menus_order ON sub_menus("order")`);
  
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
    position TEXT NOT NULL, -- left/right
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
        {"id":1,"name":"Home","order":1},
        {"id":2,"name":"AI Platform","order":2},
        {"id":3,"name":"Cloud Server","order":3},
        {"id":4,"name":"Software","order":5},
        {"id":5,"name":"Tools","order":6},
        {"id":6,"name":"Mail&Domain","order":7},
        {"id":7,"name":"Container&VPS","order":4},
        {"id":8,"name":"Dev","order":8}
      ];
      const stmt = db.prepare('INSERT INTO menus (name, "order") VALUES (?, ?)');
      defaultMenus.forEach(([name, order]) => stmt.run(name, order));
      stmt.finalize(() => {
        // 确保菜单插入完成后再插入子菜单和卡片
        console.log('菜单插入完成，开始插入默认子菜单和卡片...');
        insertDefaultSubMenusAndCards();
      });
    }
  });

  // 插入默认子菜单和卡片的函数
  function insertDefaultSubMenusAndCards() {
    db.all('SELECT * FROM menus ORDER BY "order"', (err, menus) => {
      if (err) {
        console.error('获取菜单失败:', err);
        return;
      }
      
      if (menus && menus.length) {
        console.log('找到菜单数量:', menus.length);
        menus.forEach(menu => {
          console.log(`菜单: ${menu.name} (ID: ${menu.id})`);
        });
        
        const menuMap = {};
        menus.forEach(m => { menuMap[m.name] = m.id; });
        console.log('菜单映射:', menuMap);
        
        // 插入子菜单
        const subMenus = [
          {"id":4,"parent_id":4,"name":"Proxy","order":1},
          {"id":5,"parent_id":4,"name":"Macos","order":2},
          {"id":9,"parent_id":7,"name":"Game Server","order":1},
          {"id":10,"parent_id":5,"name":"Free SMS","order":1},
          {"id":11,"parent_id":6,"name":"Domain","order":1}
        ];
        
        const subMenuStmt = db.prepare('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)');
        let subMenuInsertCount = 0;
        const subMenuMap = {};
        
        subMenus.forEach(subMenu => {
          if (menuMap[subMenu.parentMenu]) {
            subMenuStmt.run(menuMap[subMenu.parentMenu], subMenu.name, subMenu.order, function(err) {
              if (err) {
                console.error(`插入子菜单失败 [${subMenu.parentMenu}] ${subMenu.name}:`, err);
              } else {
                subMenuInsertCount++;
                // 保存子菜单ID映射，用于后续插入卡片
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
          
          // 插入卡片（包括主菜单卡片和子菜单卡片）
          const cards = [
            // cards menu
            {"id":1,"menu_id":1,"sub_menu_id":null,"title":"Backend","url":"https://nav.amossweet.ggff.net/admin","logo_url":"https://aomega-yahai.serv00.net/wp-content/uploads/2025/10/backendicon.jpg","custom_logo_path":null,"desc":"信息导航管理系统","order":1},
            {"id":2,"menu_id":1,"sub_menu_id":null,"title":"Youtube","url":"https://www.youtube.com","logo_url":"https://img.icons8.com/ios-filled/100/ff1d06/youtube-play.png","custom_logo_path":null,"desc":"全球最大的视频社区","order":10},
            {"id":3,"menu_id":1,"sub_menu_id":null,"title":"Gmail","url":"https://mail.google.com","logo_url":"https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico","custom_logo_path":null,"desc":"","order":11},
            {"id":4,"menu_id":1,"sub_menu_id":null,"title":"GitHub","url":"https://github.com","logo_url":"","custom_logo_path":null,"desc":"全球最大的代码托管平台","order":3},
            {"id":5,"menu_id":1,"sub_menu_id":null,"title":"ip.sb","url":"https://ip.sb","logo_url":"","custom_logo_path":null,"desc":"ip地址查询","order":16},
            {"id":6,"menu_id":1,"sub_menu_id":null,"title":"Cloudflare","url":"https://dash.cloudflare.com","logo_url":"","custom_logo_path":null,"desc":"全球最大的cdn服务商","order":2},
            {"id":7,"menu_id":1,"sub_menu_id":null,"title":"域名&邮箱&Code","url":"https://cs.a.3.e.f.0.d.0.0.1.0.a.2.ip6.arpa/","logo_url":"https://aomega-yahai.serv00.net/wp-content/uploads/2025/10/domain_account.webp","custom_logo_path":null,"desc":"账号&笔记信息","order":4},
            {"id":8,"menu_id":1,"sub_menu_id":null,"title":"Huggingface","url":"https://huggingface.co","logo_url":"","custom_logo_path":null,"desc":"全球最大的开源模型托管平台","order":22},
            {"id":9,"menu_id":1,"sub_menu_id":null,"title":"ITDOG - 在线ping","url":"https://www.itdog.cn/tcping","logo_url":"","custom_logo_path":null,"desc":"在线tcping","order":12},
            {"id":10,"menu_id":1,"sub_menu_id":null,"title":"Ping0","url":"https://ping0.cc","logo_url":"","custom_logo_path":null,"desc":"ip地址查询","order":13},
            {"id":11,"menu_id":1,"sub_menu_id":null,"title":"浏览器指纹","url":"https://www.browserscan.net/zh","logo_url":"","custom_logo_path":null,"desc":"浏览器指纹查询","order":18},
            {"id":12,"menu_id":1,"sub_menu_id":null,"title":"CF_VPS面板","url":"https://monitor.yahaibiotech.dpdns.org/","logo_url":"https://monitor.yahaibiotech.dpdns.org/favicon.svg","custom_logo_path":null,"desc":"cloudflare面板","order":9},
            {"id":13,"menu_id":1,"sub_menu_id":null,"title":"Api测试","url":"https://hoppscotch.io","logo_url":"","custom_logo_path":null,"desc":"在线api测试工具","order":17},
            {"id":14,"menu_id":1,"sub_menu_id":null,"title":"域名检查","url":"https://who.cx","logo_url":"","custom_logo_path":null,"desc":"域名可用性查询","order":14},
            {"id":15,"menu_id":1,"sub_menu_id":null,"title":"域名比价","url":"https://www.whois.com","logo_url":"","custom_logo_path":null,"desc":"域名价格比较","order":15},
            {"id":16,"menu_id":1,"sub_menu_id":null,"title":"NodeSeek","url":"https://www.nodeseek.com","logo_url":"https://www.nodeseek.com/static/image/favicon/favicon-32x32.png","custom_logo_path":null,"desc":"主机论坛","order":21},
            {"id":17,"menu_id":1,"sub_menu_id":null,"title":"Linux do","url":"https://linux.do","logo_url":"https://linux.do/uploads/default/optimized/3X/9/d/9dd49731091ce8656e94433a26a3ef36062b3994_2_32x32.png","custom_logo_path":null,"desc":"新的理想型社区","order":19},
            {"id":18,"menu_id":1,"sub_menu_id":null,"title":"在线音乐","url":"https://music.amossweet.ggff.net/","logo_url":"https://p3.music.126.net/tBTNafgjNnTL1KlZMt7lVA==/18885211718935735.jpg","custom_logo_path":null,"desc":"在线音乐Solara","order":8},
            {"id":19,"menu_id":1,"sub_menu_id":null,"title":"在线电影","url":"https://moonvt.solohot.dpdns.org","logo_url":"https://img.icons8.com/color/240/cinema---v1.png","custom_logo_path":null,"desc":"在线电影","order":7},
            {"id":20,"menu_id":1,"sub_menu_id":null,"title":"Nodeloc Forum","url":"https://www.nodeloc.com/","logo_url":"https://s.rmimg.com/optimized/1X/660236e67b776cefea8b2df2276659af2f4eda2a_2_32x32.png","custom_logo_path":null,"desc":"Nodeloc论坛","order":20},
            {"id":21,"menu_id":1,"sub_menu_id":null,"title":"订阅转换","url":"https://linksub.yahaibiology.dpdns.org/","logo_url":"https://img.icons8.com/color/96/link--v1.png","custom_logo_path":null,"desc":"好用的订阅转换工具","order":6},
            {"id":22,"menu_id":1,"sub_menu_id":null,"title":"webssh","url":"https://ssh.eooce.com","logo_url":"https://img.icons8.com/fluency/240/ssh.png","custom_logo_path":null,"desc":"最好用的webssh终端管理工具","order":23},
            {"id":23,"menu_id":1,"sub_menu_id":null,"title":"Nodes infor","url":"https://nd.2.8.e.f.0.d.0.0.1.0.a.2.ip6.arpa/","logo_url":"https://img.icons8.com/nolan/256/document.png","custom_logo_path":null,"desc":"Personal nodes","order":5},
            {"id":24,"menu_id":1,"sub_menu_id":null,"title":"真实地址生成","url":"https://address.nnuu.nyc.mn","logo_url":"https://static11.meiguodizhi.com/favicon.ico","custom_logo_path":null,"desc":"基于当前ip生成真实的地址","order":24},
            {"id":25,"menu_id":2,"sub_menu_id":null,"title":"ChatGPT","url":"https://chat.openai.com","logo_url":"https://cdn.oaistatic.com/assets/favicon-180x180-od45eci6.webp","custom_logo_path":null,"desc":"OpenAI官方AI对话","order":1},
            {"id":26,"menu_id":2,"sub_menu_id":null,"title":"Deepseek","url":"https://www.deepseek.com","logo_url":"https://cdn.deepseek.com/chat/icon.png","custom_logo_path":null,"desc":"Deepseek AI搜索","order":4},
            {"id":27,"menu_id":2,"sub_menu_id":null,"title":"Claude","url":"https://claude.ai","logo_url":"https://img.icons8.com/fluency/240/claude-ai.png","custom_logo_path":null,"desc":"Anthropic Claude AI","order":2},
            {"id":28,"menu_id":2,"sub_menu_id":null,"title":"Gemini","url":"https://gemini.google.com","logo_url":"https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg","custom_logo_path":null,"desc":"Google Gemini大模型","order":3},
            {"id":29,"menu_id":2,"sub_menu_id":null,"title":"阿里千问","url":"https://chat.qwenlm.ai","logo_url":"https://g.alicdn.com/qwenweb/qwen-ai-fe/0.0.11/favicon.ico","custom_logo_path":null,"desc":"阿里云千问大模型","order":6},
            {"id":30,"menu_id":2,"sub_menu_id":null,"title":"Kimi","url":"https://www.kimi.com","logo_url":"","custom_logo_path":null,"desc":"月之暗面Moonshot AI","order":5},
            {"id":31,"menu_id":null,"sub_menu_id":1,"title":"ChatGPT","url":"https://chat.openai.com","logo_url":"https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico","custom_logo_path":null,"desc":"OpenAI官方AI对话","order":0},
            {"id":32,"menu_id":null,"sub_menu_id":1,"title":"Deepseek","url":"https://www.deepseek.com","logo_url":"https://cdn.deepseek.com/chat/icon.png","custom_logo_path":null,"desc":"Deepseek AI搜索","order":0},
            {"id":33,"menu_id":null,"sub_menu_id":2,"title":"ChatGPT","url":"https://chat.openai.com","logo_url":"https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico","custom_logo_path":null,"desc":"OpenAI官方AI对话","order":0},
            {"id":34,"menu_id":null,"sub_menu_id":2,"title":"Deepseek","url":"https://www.deepseek.com","logo_url":"https://cdn.deepseek.com/chat/icon.png","custom_logo_path":null,"desc":"Deepseek AI搜索","order":0},
            {"id":35,"menu_id":3,"sub_menu_id":null,"title":"阿里云","url":"https://www.aliyun.com","logo_url":"https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico","custom_logo_path":null,"desc":"阿里云官网","order":0},
            {"id":36,"menu_id":3,"sub_menu_id":null,"title":"腾讯云","url":"https://cloud.tencent.com","logo_url":"","custom_logo_path":null,"desc":"腾讯云官网","order":0},
            {"id":37,"menu_id":3,"sub_menu_id":null,"title":"甲骨文云","url":"https://cloud.oracle.com","logo_url":"","custom_logo_path":null,"desc":"Oracle Cloud","order":0},
            {"id":38,"menu_id":3,"sub_menu_id":null,"title":"亚马逊云","url":"https://aws.amazon.com","logo_url":"https://img.icons8.com/color/144/amazon-web-services.png","custom_logo_path":null,"desc":"Amazon AWS","order":0},
            {"id":39,"menu_id":3,"sub_menu_id":null,"title":"DigitalOcean","url":"https://www.digitalocean.com","logo_url":"https://www.digitalocean.com/_next/static/media/apple-touch-icon.d7edaa01.png","custom_logo_path":null,"desc":"DigitalOcean VPS","order":0},
            {"id":40,"menu_id":3,"sub_menu_id":null,"title":"Vultr","url":"https://www.vultr.com","logo_url":"","custom_logo_path":null,"desc":"Vultr VPS","order":0},
            {"id":41,"menu_id":4,"sub_menu_id":null,"title":"Hellowindows","url":"https://hellowindows.cn","logo_url":"https://hellowindows.cn/logo-s.png","custom_logo_path":null,"desc":"windows系统及office下载","order":0},
            {"id":42,"menu_id":4,"sub_menu_id":null,"title":"奇迹秀","url":"https://www.qijishow.com/down","logo_url":"https://www.qijishow.com/img/ico.ico","custom_logo_path":null,"desc":"设计师的百宝箱","order":0},
            {"id":43,"menu_id":4,"sub_menu_id":null,"title":"易破解","url":"https://www.ypojie.com","logo_url":"https://www.ypojie.com/favicon.ico","custom_logo_path":null,"desc":"精品windows软件","order":0},
            {"id":44,"menu_id":4,"sub_menu_id":null,"title":"软件先锋","url":"https://topcracked.com","logo_url":"https://cdn.mac89.com/win_macxf_node/static/favicon.ico","custom_logo_path":null,"desc":"精品windows软件","order":0},
            {"id":45,"menu_id":4,"sub_menu_id":null,"title":"Macwk","url":"https://www.macwk.com","logo_url":"https://www.macwk.com/favicon-32x32.ico","custom_logo_path":null,"desc":"精品Mac软件","order":0},
            {"id":46,"menu_id":4,"sub_menu_id":null,"title":"Macsc","url":"https://mac.macsc.com","logo_url":"https://cdn.mac89.com/macsc_node/static/favicon.ico","custom_logo_path":null,"desc":"","order":0},
            {"id":47,"menu_id":5,"sub_menu_id":null,"title":"JSON工具","url":"https://www.json.cn","logo_url":"https://img.icons8.com/nolan/128/json.png","custom_logo_path":null,"desc":"JSON格式化/校验","order":0},
            {"id":48,"menu_id":5,"sub_menu_id":null,"title":"base64工具","url":"https://www.qqxiuzi.cn/bianma/base64.htm","logo_url":"https://cdn.base64decode.org/assets/images/b64-180.webp","custom_logo_path":null,"desc":"在线base64编码解码","order":0},
            {"id":49,"menu_id":5,"sub_menu_id":null,"title":"二维码生成","url":"https://qrcode.yahaibio.qzz.io ","logo_url":"https://img.icons8.com/fluency/96/qr-code.png","custom_logo_path":null,"desc":"自建二维码生成工具","order":0},
            {"id":50,"menu_id":5,"sub_menu_id":null,"title":"JS混淆","url":"https://obfuscator.io","logo_url":"https://img.icons8.com/color/240/javascript--v1.png","custom_logo_path":null,"desc":"在线Javascript代码混淆","order":0},
            {"id":51,"menu_id":5,"sub_menu_id":null,"title":"Python混淆","url":"https://freecodingtools.org/tools/obfuscator/python","logo_url":"https://img.icons8.com/color/240/python--v1.png","custom_logo_path":null,"desc":"在线python代码混淆","order":0},
            {"id":52,"menu_id":5,"sub_menu_id":null,"title":"Remove.photos","url":"https://remove.photos/zh-cn","logo_url":"https://img.icons8.com/doodle/192/picture.png","custom_logo_path":null,"desc":"一键抠图","order":0},
            {"id":53,"menu_id":null,"sub_menu_id":3,"title":"Uiverse","url":"https://uiverse.io/elements","logo_url":"https://img.icons8.com/fluency/96/web-design.png","custom_logo_path":null,"desc":"CSS动画和设计元素","order":0},
            {"id":54,"menu_id":null,"sub_menu_id":3,"title":"Icons8","url":"https://igoutu.cn/icons","logo_url":"https://maxst.icons8.com/vue-static/landings/primary-landings/favs/icons8_fav_32×32.png","custom_logo_path":null,"desc":"免费图标和设计资源","order":0},
            {"id":55,"menu_id":6,"sub_menu_id":null,"title":"Gmail","url":"https://mail.google.com","logo_url":"https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico","custom_logo_path":null,"desc":"Google邮箱","order":0},
            {"id":56,"menu_id":6,"sub_menu_id":null,"title":"Outlook","url":"https://outlook.live.com","logo_url":"https://img.icons8.com/color/256/ms-outlook.png","custom_logo_path":null,"desc":"微软Outlook邮箱","order":0},
            {"id":57,"menu_id":6,"sub_menu_id":null,"title":"Proton Mail","url":"https://account.proton.me","logo_url":"https://account.proton.me/assets/apple-touch-icon-120x120.png","custom_logo_path":null,"desc":"安全加密邮箱","order":0},
            {"id":58,"menu_id":6,"sub_menu_id":null,"title":"QQ邮箱","url":"https://mail.qq.com","logo_url":"https://mail.qq.com/zh_CN/htmledition/images/favicon/qqmail_favicon_96h.png","custom_logo_path":null,"desc":"腾讯QQ邮箱","order":0},
            {"id":59,"menu_id":6,"sub_menu_id":null,"title":"雅虎邮箱","url":"https://mail.yahoo.com","logo_url":"https://img.icons8.com/color/240/yahoo--v2.png","custom_logo_path":null,"desc":"雅虎邮箱","order":0},
            {"id":60,"menu_id":6,"sub_menu_id":null,"title":"10分钟临时邮箱","url":"https://linshiyouxiang.net","logo_url":"https://linshiyouxiang.net/static/index/zh/images/favicon.ico","custom_logo_path":null,"desc":"10分钟临时邮箱","order":0},
            {"id":61,"menu_id":7,"sub_menu_id":null,"title":"serv00_S10","url":"https://panel10.serv00.com/","logo_url":"https://panel10.serv00.com/static/svg/serv00/favicon.svg","custom_logo_path":null,"desc":"S10","order":0},
            {"id":62,"menu_id":7,"sub_menu_id":null,"title":"serv00_S7","url":"https://panel7.serv00.com/","logo_url":"https://panel7.serv00.com/static/svg/serv00/favicon.svg","custom_logo_path":null,"desc":"S7","order":0},
            {"id":63,"menu_id":7,"sub_menu_id":null,"title":"Serv00官网","url":"https://www.serv00.com/","logo_url":"https://www.serv00.com/wp-content/uploads/2025/05/cropped-favicon-1-32x32.png","custom_logo_path":null,"desc":"Official Website","order":0},
            {"id":64,"menu_id":2,"sub_menu_id":null,"title":"问小白","url":"https://www.wenxiaobai.com/","logo_url":"https://wy-static.wenxiaobai.com/wenxiaobai-web/production/3.15.1/_next/static/media/new_favicon.6d31cfe4.png","custom_logo_path":null,"desc":"Deepseek第三方平台","order":7},
            {"id":65,"menu_id":2,"sub_menu_id":null,"title":"Genspark","url":"https://www.genspark.ai/agents?type=moa_chat","logo_url":"https://www.genspark.ai/favicon.ico","custom_logo_path":null,"desc":null,"order":8},
            {"id":66,"menu_id":2,"sub_menu_id":null,"title":"AkashChat","url":"https://chat.akash.network/","logo_url":"https://chat.akash.network/favicon.ico","custom_logo_path":null,"desc":null,"order":9},
            {"id":67,"menu_id":2,"sub_menu_id":null,"title":"V0","url":"https://v0.app/chat","logo_url":"https://v0.app/assets/icon-light-32x32.png","custom_logo_path":null,"desc":"Vercel旗下前端AI编程工具","order":10},
            {"id":68,"menu_id":2,"sub_menu_id":null,"title":"Same","url":"https://same.new/","logo_url":"https://same.new/favicon.svg","custom_logo_path":null,"desc":"AI快速仿站","order":11},
            {"id":69,"menu_id":2,"sub_menu_id":null,"title":"Haisnap","url":"https://www.haisnap.com/","logo_url":"https://www.haisnap.com/favicon.ico","custom_logo_path":null,"desc":"AI零代码应用平台","order":12},
            {"id":70,"menu_id":2,"sub_menu_id":null,"title":"Readdy","url":"https://readdy.ai/zh","logo_url":"https://readdy.ai/site-static/favicon/favicon.ico","custom_logo_path":null,"desc":"网站构建","order":13},
            {"id":72,"menu_id":2,"sub_menu_id":null,"title":"Openrouter","url":"https://openrouter.ai/","logo_url":"https://openrouter.ai/favicon.ico","custom_logo_path":null,"desc":"Interface for LLMs","order":14},
            {"id":73,"menu_id":2,"sub_menu_id":null,"title":"Manus","url":"https://manus.im/","logo_url":"https://manus.im/favicon.ico","custom_logo_path":null,"desc":"全场景AI","order":15},
            {"id":75,"menu_id":2,"sub_menu_id":null,"title":"Grok","url":"https://grok.com/","logo_url":"https://grok.com/images/favicon-light.png","custom_logo_path":null,"desc":"马斯克AI","order":3},
            {"id":76,"menu_id":2,"sub_menu_id":null,"title":"Copilot","url":"https://copilot.microsoft.com/","logo_url":"https://copilot.microsoft.com/static/cmc/favicon.svg","custom_logo_path":null,"desc":"微软旗下AI","order":3},
            {"id":77,"menu_id":2,"sub_menu_id":null,"title":"豆包","url":"https://www.doubao.com/chat/","logo_url":"https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/web/logo-icon.png","custom_logo_path":null,"desc":"字节跳动旗下AI","order":6},
            {"id":78,"menu_id":2,"sub_menu_id":null,"title":"文心一言","url":"https://yiyan.baidu.com/","logo_url":"https://eb-static.cdn.bcebos.com/logo/favicon.ico","custom_logo_path":null,"desc":"百度旗下AI","order":7},
            {"id":79,"menu_id":2,"sub_menu_id":null,"title":"Jules","url":"https://jules.google.com/","logo_url":"https://www.gstatic.com/labs-code/code-app/favicon-48x48.png","custom_logo_path":null,"desc":"Google旗下管理Github项目AI","order":16},
            {"id":80,"menu_id":2,"sub_menu_id":null,"title":"Sillicon Flow","url":"https://account.siliconflow.cn/","logo_url":"https://account.siliconflow.cn/logo.svg","custom_logo_path":null,"desc":"免费大模型API平台","order":17},
            {"id":81,"menu_id":2,"sub_menu_id":null,"title":"Kilo Code","url":"https://kilocode.ai/","logo_url":"https://kilocode.ai/favicon.ico","custom_logo_path":null,"desc":"亚马逊旗下AI编程工具","order":18},
            {"id":82,"menu_id":2,"sub_menu_id":null,"title":"Cursor","url":"https://cursor.com/","logo_url":"https://cursor.com/marketing-static/favicon-light.svg","custom_logo_path":null,"desc":"AI变成工具","order":19},
            {"id":83,"menu_id":2,"sub_menu_id":null,"title":"AI换脸","url":"https://imgai.ai/","logo_url":"https://imgai.ai/imgai.svg","custom_logo_path":null,"desc":"一键AI图像处理","order":20},
            {"id":84,"menu_id":2,"sub_menu_id":null,"title":"Aippt","url":"https://www.aippt.cn/","logo_url":"https://www.aippt.cn/_nuxt/logo_dark.BU64bLWp.svg","custom_logo_path":null,"desc":"AI生成PPT","order":21},
            {"id":85,"menu_id":2,"sub_menu_id":null,"title":"AI照片修复","url":"https://picwish.cn/photo-enhancer","logo_url":"https://qncdn.aoscdn.com/astro/picwish/_astro/favicon@30w.61721eae.png","custom_logo_path":null,"desc":"照片修复","order":22},
            {"id":86,"menu_id":2,"sub_menu_id":null,"title":"Bolt","url":"https://bolt.new/","logo_url":"https://bolt.new/static/favicon.svg","custom_logo_path":null,"desc":"AI生成前端","order":23},
            {"id":87,"menu_id":2,"sub_menu_id":null,"title":"Llamacoder","url":"https://llamacoder.together.ai/","logo_url":"https://llamacoder.together.ai/favicon.ico","custom_logo_path":null,"desc":"AI生成app","order":24},
            {"id":88,"menu_id":2,"sub_menu_id":null,"title":"Codia","url":"https://codia.ai/","logo_url":"https://codia.ai/favicon.ico","custom_logo_path":null,"desc":"AI代码生成","order":25},
            {"id":89,"menu_id":2,"sub_menu_id":null,"title":"Perplexity","url":"https://www.perplexity.ai/","logo_url":"","custom_logo_path":null,"desc":null,"order":26},
            {"id":90,"menu_id":3,"sub_menu_id":null,"title":"Google云","url":"https://cloud.google.com/","logo_url":"https://www.gstatic.com/cgc/favicon.ico","custom_logo_path":null,"desc":"Google提供3个月免费云","order":7},
            {"id":91,"menu_id":3,"sub_menu_id":null,"title":"Azure","url":"https://azure.microsoft.com/","logo_url":"https://azure.microsoft.com/favicon.ico?v2","custom_logo_path":null,"desc":"微软提供1年免费云","order":7},
            {"id":92,"menu_id":3,"sub_menu_id":null,"title":"Lindoe","url":"https://www.linode.com/","logo_url":"https://assets.linode.com/icons/favicon.ico","custom_logo_path":null,"desc":"免费2个月（易封）","order":7},
            {"id":93,"menu_id":3,"sub_menu_id":null,"title":"Dartnode","url":"https://dartnode.com/","logo_url":"https://dartnode.com/assets/dash/images/brand/favicon2.png","custom_logo_path":null,"desc":"开源可申永久免费","order":0},
            {"id":94,"menu_id":3,"sub_menu_id":null,"title":"Cloudcone","url":"https://app.cloudcone.com/","logo_url":"https://app.cloudcone.com/assets/img/favicon.png","custom_logo_path":null,"desc":"每年$10","order":10},
            {"id":95,"menu_id":3,"sub_menu_id":null,"title":"Dmit","url":"https://www.dmit.io/","logo_url":"https://www.dmit.io/templates/dmit_theme_2020/dmit/homepage/assets/images/partner/retn.svg","custom_logo_path":null,"desc":"优质VPS线路","order":9},
            {"id":96,"menu_id":3,"sub_menu_id":null,"title":"Bandwagonhost","url":"https://bandwagonhost.com/","logo_url":"https://bandwagonhost.com/templates/organicbandwagon/images/logo4.png","custom_logo_path":null,"desc":"CN2-GIA优质路线","order":9},
            {"id":97,"menu_id":3,"sub_menu_id":null,"title":"Myracknerd","url":"https://my.racknerd.com/","logo_url":"https://my.racknerd.com/templates/racknerdv851/files/favicon.png","custom_logo_path":null,"desc":"每年$10","order":10},
            {"id":98,"menu_id":3,"sub_menu_id":null,"title":"Atlantic","url":"https://cloud.atlantic.net/","logo_url":"https://cloud.atlantic.net/images/rs/82421f550021c450a30c54d2faad4fce.png","custom_logo_path":null,"desc":"免费一年（易封）","order":7},
            {"id":99,"menu_id":3,"sub_menu_id":null,"title":"Lightnode","url":"https://www.lightnode.com/","logo_url":"https://www.lightnode.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fheader-logo.e778fe1e.png&w=1080&q=75","custom_logo_path":null,"desc":"冷门区域","order":0},
            {"id":100,"menu_id":3,"sub_menu_id":null,"title":"Ihosting","url":"https://ishosting.com/","logo_url":"https://ishosting.com/meta/landing/safari-pinned-tab.svg","custom_logo_path":null,"desc":"多区域选择","order":0},
            {"id":101,"menu_id":3,"sub_menu_id":null,"title":"Diylink","url":"https://console.diylink.net/","logo_url":"https://console.diylink.net/favicon.ico","custom_logo_path":null,"desc":"套壳google和AWS的vps","order":0},
            {"id":102,"menu_id":3,"sub_menu_id":null,"title":"IBM","url":"https://linuxone.cloud.marist.edu/","logo_url":"https://linuxone.cloud.marist.edu/resources/images/linuxonelogo03.png","custom_logo_path":null,"desc":"免费4个月（需住宅IP注册）","order":0},
            {"id":103,"menu_id":3,"sub_menu_id":null,"title":"Sharon","url":"https://whmcs.sharon.io/","logo_url":"https://whmcs.sharon.io/templates/lagom2/assets/img/favicons/favicon.ico","custom_logo_path":null,"desc":"3网优质路线","order":0},
            {"id":104,"menu_id":3,"sub_menu_id":null,"title":"Alicenetworks","url":"https://alicenetworks.net/","logo_url":"https://console.alice.ws/icon.png","custom_logo_path":null,"desc":null,"order":0},
            {"id":105,"menu_id":3,"sub_menu_id":null,"title":"Yxvm","url":"https://yxvm.com/","logo_url":"https://yxvm.com/assets/img/logo.png","custom_logo_path":null,"desc":null,"order":0},
            {"id":106,"menu_id":3,"sub_menu_id":null,"title":"Cloudforest","url":"https://cloud.cloudforest.ro/","logo_url":"","custom_logo_path":null,"desc":"Romania free 3 months vps","order":0},
            {"id":107,"menu_id":3,"sub_menu_id":null,"title":"Huawei Cloud","url":"https://www.huaweicloud.com/","logo_url":"https://www.huaweicloud.com/favicon.ico","custom_logo_path":null,"desc":"free developer vps","order":0},
            {"id":108,"menu_id":7,"sub_menu_id":null,"title":"Koyeb","url":"https://app.koyeb.com/","logo_url":"https://www.koyeb.com/static/images/illustrations/og/koyeb-home.png","custom_logo_path":null,"desc":"free container(clean IP, no credit card)","order":1},
            {"id":109,"menu_id":7,"sub_menu_id":null,"title":"Render","url":"https://dashboard.render.com/","logo_url":"https://dashboard.render.com/favicon-light.png","custom_logo_path":null,"desc":"free container(clean IP, no credit card)","order":1},
            {"id":110,"menu_id":7,"sub_menu_id":null,"title":"Fly","url":"https://fly.io/","logo_url":"https://fly.io/phx/ui/images/favicon/favicon-595d1312b35dfe32838befdf8505515e.ico?vsn=d","custom_logo_path":null,"desc":"free container(need credit card)","order":2},
            {"id":111,"menu_id":7,"sub_menu_id":null,"title":"Choreo","url":"https://console.choreo.dev/","logo_url":"https://console.choreo.dev/favicon.ico","custom_logo_path":null,"desc":"free container(no credit card)","order":2},
            {"id":112,"menu_id":7,"sub_menu_id":null,"title":"Railway","url":"https://railway.com/","logo_url":"https://railway.com/apple-touch-icon.png","custom_logo_path":null,"desc":"free container(one moths, clean IP, no credit card, after expired, delete account and register again)","order":3},
            {"id":113,"menu_id":7,"sub_menu_id":null,"title":"Galaxycloud","url":"https://beta.galaxycloud.app/","logo_url":"https://beta.galaxycloud.app/favicon.ico?v2","custom_logo_path":null,"desc":"free container(no credit card)","order":2},
            {"id":114,"menu_id":7,"sub_menu_id":null,"title":"Azure","url":"https://azure.microsoft.com/en-us/pricing/offers/ms-azr-0144p","logo_url":"https://azure.microsoft.com/favicon.ico?v2","custom_logo_path":null,"desc":"free container(register 10 containersthrough az200 or edu email)","order":2},
            {"id":115,"menu_id":4,"sub_menu_id":4,"title":"v2rayN","url":"https://v2rayn.2dust.link/","logo_url":"https://aomega-yahai.serv00.net/wp-content/uploads/2025/10/v2rayN.png","custom_logo_path":null,"desc":"最受欢迎的（支持多平台）","order":0},
            {"id":116,"menu_id":4,"sub_menu_id":4,"title":"Mihomo Party","url":"https://clashparty.org/","logo_url":"https://clashparty.org/logo.png","custom_logo_path":null,"desc":"Mihomo内核最受欢迎","order":0},
            {"id":117,"menu_id":4,"sub_menu_id":4,"title":"GUI.for.SingBox","url":"https://github.com/GUI-for-Cores/GUI.for.SingBox/releases/latest","logo_url":"data:image/png;base64,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","custom_logo_path":null,"desc":"第三方开源singbox代理工具","order":0},
            {"id":118,"menu_id":4,"sub_menu_id":4,"title":"FlClash","url":"https://github.com/chen08209/FlClash/releases/latest","logo_url":"data:image/jpeg;base64,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","custom_logo_path":null,"desc":"Clash系列高人气","order":0},
            {"id":119,"menu_id":4,"sub_menu_id":4,"title":"Karing","url":"https://karing.app/download/","logo_url":"https://karing.app/img/logo.png","custom_logo_path":null,"desc":"新一代适配多平台","order":0},
            {"id":120,"menu_id":4,"sub_menu_id":4,"title":"Nekobox","url":"https://nekobox.tools/nekoray/","logo_url":"https://nekobox.tools/wp-content/uploads/2023/12/favicon-55x55.png","custom_logo_path":null,"desc":"Windows版本已停维，谨慎使用","order":0},
            {"id":121,"menu_id":4,"sub_menu_id":4,"title":"FlyClash","url":"https://github.com/GtxFury/FlyClash/releases/latest","logo_url":"data:image/jpeg;base64,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","custom_logo_path":null,"desc":"Mihomo内核新一代","order":0},
            {"id":122,"menu_id":4,"sub_menu_id":4,"title":"ClashBox","url":"https://github.com/xiaobaigroup/ClashBox","logo_url":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAMAAzAMBIgACEQEDEQH/xAAcAAEAAgIDAQAAAAAAAAAAAAAAAQIGBwQFCAP/xABGEAABAwMBBAYGBAoKAwAAAAAAAQIDBAURBgcSITETQVFhcYEUIpGhscEyQnKSFTNSU2KCk8LS8BYXI0VUVWOisuE1Q0b/xAAZAQEAAwEBAAAAAAAAAAAAAAAAAQMEAgX/xAAhEQEBAAIBBAMBAQAAAAAAAAAAAQIRAwQSITEiMlFBE//aAAwDAQACEQMRAD8A3iAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAE5IyhjWu9Srpi0Mqoo2S1E0yRRRvzhVwqqq47kX3FdGaxpNTROja3oK6JuZYFXPD8pq9ae9Mpnmh3/nl2938c9+O+1lAIJOHQAAAAAEZCqiczB9d69j09M2it8MdVXY3ntcvqxp1IuOtez/o6xxuV1HOWUxm6zkHFtdbFcbbS1tOuYqiJsrPByIvzOSc2a8Jl2kABIAAAAAAAAAAAAAEEkKBqHbTWdLeLdRIvCCB0ip3vdj4M95glsuFRa7hBX0T1ZPC7eaqdfai9ypwO52jVfpetLk9Fy2JzYU7t1Ez7zHMnrcOM/wA5jXncmXztekNO3mC+2mCvpl4SJ6zetjk5odoaM2Y6kWy3ttFVPxRVzkYuV4Mk+qvnwRfI3lk87m4/88tNvFn3YpBCrjnwK77Pyk9pV5WLgjKEZ7gOp1VeorBZam4S4c5jcRMVfpvXkn89R54qamerqJamqkWSeVyvkev1nKZntZv34RviW6B+aei4OxyWRefs5GD5PT6Xj7ce6/1g6jLuy1G8dk9YtVo2njcuXUskkK+CLlPc5DMzVexOs/8AKULl62TNT2ovyNpmHmmuStfFd4RIAKlgAAAAAAAAAAAAAFJHIxrnO5ImVLnWakqkorDcKly4SOne7w4EybqL6edbpUrV3SsqHcVlne7PmpxSrVXdTe+l1+JJ7OM1JHm2+UrxTHUd3Uav1HUsayW81aNamESNUj4d+6iZ8zpALjL7hLY+81bVzOV0tVUPVeavlVc+0+XSSfnH/eUqBqG6+8VdWQqiw1dRGqctyVyHa0usdSUn4i9VXhIqSp/vRfcdGCLhjfcO6/qz3ukkfJI5XPe5XOcvNVXiqlSBk6QzXZHWejaubCq4bUQOZ4qnFDeR5v0hV+haptdQrsNSpa1e9Her8z0gh5vVz57bOnvx0kAGZoAAAAAAAAAAAAAAxHanU+jaJuH+ruxeO85EMuNcbb6ro9P0VMi8Z6tMp3Naq/HBZxTecccl1jWmyclc4OVa6GW53OloIFRJKmVsbVXkmes9W3Xlg046qMm8afZhpyOhSnlhlklxxnWRUdntTqNRapsr9P3yptr5OkSNUdG/H0mLyVe/tKsOfHO6jvLiuM3XV5GSoLVelsjJUtGx0kjGRpvPe5GtTtVVwiDf9pIIpGTdto2X2OC3NjuUb6qqc3+0k31REX9HHI1prvTX9GL0lLE9z6aZm/A530sclRf560KsOfHO9sWZcVxm2PMmWCRk7ecL0kTxRc/I9R0cqT0kMrVykkbXIvblDyyvFOPE9GaAq/TtG2iZVy70drHfab6q+9FKerniVb0982MhABhagAAAAAAAAAAAAANPbdalXXKz0qO9VkMsrm+KtRF9zjcJoTbHU9Prl7EXKQUkUSp35c/4PQv6eb5FXNfiwzOTlWuultlzpbhTpmWmlbK1F68LxTwVMnDz3DJ6F1d7Y54b3g2oacfQ+kSyzRS7vGBY1V2exO3xNQapvcmoL5U3KRnRpJhsceeLGJyTx5r5nT5GSvj4cMLuO8uTLKaWyMnKtltrbrI+K3wOqJGN3nMaqZxnv5ncN0dX+i4WeBl1dl7bY56dMsXLe54R2fq9iczu5ye651ax3JaOR0cjZGOVHMVHIvYqcTk3S1V1qfGy406wPkbvNY5Uzjw6vM4WSdyxGtVvK0bUbFPb2vuUj6Wqa3+0i6NVRV/RVOZrLXmpv6T3pKmKJ0dLCzo4WP8ApY5qq+PDh3GNZGSrDhwwu4svJcpqpybw2K1STaPdT/4Wslj+9iT980dk2tsIqeF6pOx0UyJ4o5q/8WnPUzeCeHxk20ADz2wAAAAAAAAAAAgkAQp5u2h1C1Oub1LlFT0hGJ+oxrP3T0ip5YvNQlXea+p/PVMj/a5VNPS/a1Rz3w4uRkqSbWZORkgAWa5zHI5jla5OStXCoN9yv31c5X5zvZ9bPbnmVAFnPc9yuc5znLzc5cqpGSABORkgASZ/sTqkh1ZUQZ4T0jkx2q1yKnuya+Mn2ZVSUuubW5f/AGPdF95qoV8s3hXeHjKPRoAPNbQAAAAAAAAhRkwjabrZdMUMdNQI190qUXo97lE3revyTrUnHG5XURbJ7ZDfdS2ewMR11rooHKmWx5y93gicTj6c1hZdRvljtdUr5YuLo3sVrsduFPPtntN41denRU6yVVXIu/PUzOyjEX6zl+CeSd29dEaHt+lYXSROWevlaiS1L06vyWp1IW58eOM9+XGOVyZDc5vR7dVVH5qF7/YiqeU99Xesv1uPtPTGuqhaTR93mzjdpne/h8zzKnBETuLemni1XzXzF8jJXIyaVNWyMlcjJJFsjJXIyQaWyMlcjJItkZK5GSErHP09UrSagtlRn8XVRrn9ZE+Z12SOldEqSJzYqOTHdxIvmD1xkk4tulSegppUXO/E12fJDlHmNoAAAAAAACFPNG0S4vuOsrpK92Wxy9CxE6mtTB6XPLmtqZ9Fq27wSIvCpcue1F4/Mv6fXdVXL6bw2UWantuj6OaNqdPWN6eZ3WqryTyTgZmiYMH2RXuG56Rp6VHJ6TQJ0MrM8cfVd4KhnCLlCrPfddrMfTDNr9QtPoOvRFx0qsi+85Dzwby27VKRaUpoFXjPVtRPJFd8jRhq6f6s/L9lhkqC9WtkZK5AFsgqSBIyVVQBbIyVGQLZIXCoqL1kDIS9NbP6havRVmmcuXLSM3l70TiZCYRsaqOn0HRIq8YpJY18nrj3GbnnZzWVa8fSQAcpAAAAAEKac23aWl6VupaKNz40akda1qZ3ET6Mnh1L2cFNyFJGMcxWvajmuTCoqZRUOsMrjdxzlj3TTylZLzcLDcG11qqHQzNTC8MtenY5OtP54G0LXtrjSJjbraX7/XJTyJj2KcvVWx6lrJX1WnqhKN7uK00iZiX7PW34Gv6/Zvq+ierfwUtSn5dNM1ye9UX3GjfHnPKrWWPp2+1DW9u1bRW6C3R1LPR51kf0zEbn1VThxXtNfnYXDTt9tkSSV9nrKdnU90e8nmqZx5nU9NFn8axF7N5C3Dtk1HOW7fL7ZGSiOR3JU9oRTvbnS4yU49oyBfIyVAFlUZKKo5jYvkZKDq7AaXyQfNZGN+k5E8VIbLG52617XOXkiLnI2arfGwafpNL1sP5mucntY13zNlmrdgtNVU9mui1FPNCySqa6PpY1Zveo1FVM80NpGDk+1acfSQAcOgAAAAACgARgEgCFRFTihxp7dQ1GfSKOnlzz34mu+KHKARp0s2ktNTO3ptP2mRe11FGvyOM/Qmkn/S05a0+zTNT4IZGCd1Ooxd2zzR7uenqDyjwfJ2zbRzv7hpk8HPT5mWgd1/UajEP6stGc/wABw/tZP4h/Vloz/I4v2sn8Rl4J7r+moxFNmmjU/uKDze9f3i6bOdHJ/wDP0a+KKvzMrBHdf01GMt2f6Qby07bvOFFPqzRGk2ctN2lfGjjX4oZCBup06mHTVhgREgsltj+xSRp8EOdDR0sCYhp4Y0TqYxEOQBuo1EIidSEgEJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/2Q==","custom_logo_path":null,"desc":"HarmonyOs NEXT代理app","order":0},
            {"id":123,"menu_id":7,"sub_menu_id":9,"title":"Wispbyte","url":"https://wispbyte.com/","logo_url":"https://wispbyte.com/assets/wispbyte_blue_nobg.webp","custom_logo_path":null,"desc":"Romania free container","order":0},
            {"id":124,"menu_id":6,"sub_menu_id":null,"title":"Temporary EDU Email","url":"https://tempmail.edu.kg/","logo_url":"","custom_logo_path":null,"desc":null,"order":0},
            {"id":125,"menu_id":5,"sub_menu_id":null,"title":"Selected IP subscription ","url":"https://autosub.yahai.nyc.mn/","logo_url":"","custom_logo_path":null,"desc":"better selected IP for subscription of CF","order":0},
            {"id":126,"menu_id":5,"sub_menu_id":null,"title":"Edge Subsription Converter","url":"https://subegde.yahai.nyc.mn/","logo_url":"","custom_logo_path":null,"desc":null,"order":0},
            {"id":127,"menu_id":5,"sub_menu_id":null,"title":"Subscription Converter online","url":"https://linksub.yahaibiology.dpdns.org/","logo_url":"","custom_logo_path":null,"desc":"minimal configuration is better ","order":0},
            {"id":128,"menu_id":6,"sub_menu_id":11,"title":"Netlib","url":"https://www.netlib.re/","logo_url":"https://aomega-yahai.serv00.net/wp-content/uploads/2025/10/domain.png","custom_logo_path":null,"desc":"Free domain delegated to cloudflare, without reverse DNS","order":0},
            {"id":129,"menu_id":4,"sub_menu_id":4,"title":"Mihomo Alpha with Smart Group","url":"https://github.com/vernesong/mihomo/releases","logo_url":"","custom_logo_path":null,"desc":"Openclash core clash_meta","order":0},
            {"id":130,"menu_id":6,"sub_menu_id":11,"title":"autologin netlibre one","url":"https://autologin.sghmc.netlib.re","logo_url":"","custom_logo_path":null,"desc":"No login for half an year, domain and account will be deleted","order":0},
            {"id":131,"menu_id":6,"sub_menu_id":11,"title":"autologin netlibre two","url":"https://monitor-netlib-re-amosgantian.menghunke.workers.dev","logo_url":"","custom_logo_path":null,"desc":"No login for half an year, domain and account will be deleted","order":0},
            {"id":132,"menu_id":8,"sub_menu_id":null,"title":"Navigation Website","url":"https://nav.yahaibio.qzz.io/","logo_url":"","custom_logo_path":null,"desc":"Deployed on Cloudflare","order":0}
          ];
          
          const cardStmt = db.prepare('INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, desc) VALUES (?, ?, ?, ?, ?, ?)');
          let cardInsertCount = 0;
          
          cards.forEach(card => {
            if (card.subMenu) {
              // 插入子菜单卡片
              // 查找对应的子菜单ID，需要遍历所有可能的父菜单
              let subMenuId = null;
              for (const [key, id] of Object.entries(subMenuMap)) {
                if (key.endsWith(`_${card.subMenu}`)) {
                  subMenuId = id;
                  break;
                }
              }
              
              if (subMenuId) {
                cardStmt.run(null, subMenuId, card.title, card.url, card.logo_url, card.desc, function(err) {
                  if (err) {
                    console.error(`插入子菜单卡片失败 [${card.subMenu}] ${card.title}:`, err);
                  } else {
                    cardInsertCount++;
                    console.log(`成功插入子菜单卡片 [${card.subMenu}] ${card.title}`);
                  }
                });
              } else {
                console.warn(`未找到子菜单: ${card.subMenu}`);
              }
            } else if (menuMap[card.menu]) {
              // 插入主菜单卡片
              cardStmt.run(menuMap[card.menu], null, card.title, card.url, card.logo_url, card.desc, function(err) {
                if (err) {
                  console.error(`插入卡片失败 [${card.menu}] ${card.title}:`, err);
                } else {
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
      } else {
        console.log('未找到任何菜单');
      }
    });
  }

  // 插入默认管理员账号
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (row && row.count === 0) {
      const passwordHash = bcrypt.hashSync(config.admin.password, 10);
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [config.admin.username, passwordHash]);
    }
  });

  // 插入默认友情链接
  db.get('SELECT COUNT(*) as count FROM friends', (err, row) => {
    if (row && row.count === 0) {
      const defaultFriends = [
        {"id":1,"title":"Noodseek图床","url":"https://www.nodeimage.com","logo":"https://www.nodeseek.com/static/image/favicon/favicon-32x32.png"},
        {"id":2,"title":"IP6.ARPA域名自动添加SSL证书","url":"https://ssl.1.2.e.f.0.d.0.0.1.0.a.2.ip6.arpa/","logo":"https://fontawesome.com/favicon.ico"},
        {"id":3,"title":"老王导航","url":"https://nav.eooce.com/","logo":""},
        {"id":4,"title":"Serv00 Status","url":"https://status.eooce.com/","logo":"https://www.serv00.com/wp-content/uploads/2025/05/cropped-favicon-1-32x32.png"},
        {"id":5,"title":"Amos博客","url":"https://blog.amos.ip-ddns.com/","logo":"https://blog.amos.ip-ddns.com/img/amoz_avatar.png"}
      ];
      const stmt = db.prepare('INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)');
      defaultFriends.forEach(([title, url, logo]) => stmt.run(title, url, logo));
      stmt.finalize();
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN last_login_time TEXT`, [], () => {});
  db.run(`ALTER TABLE users ADD COLUMN last_login_ip TEXT`, [], () => {});
});


module.exports = db; 

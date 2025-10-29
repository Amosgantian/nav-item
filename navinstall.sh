#!/bin/bash
export LC_ALL=C

# ========== 美化输出 ==========
re="\033[0m"; red="\033[1;91m"; green="\033[1;32m"; yellow="\033[1;33m"; purple="\033[1;35m"
color_echo() { echo -e "${!1}${2}${re}"; }
reading() { read -p "$(echo -e "${red}$1${re}")" "$2"; }

# ========== 基本设置 ==========
WORKDIR="/opt/nav"
DOWNLOAD_URL="https://github.com/Amosgantian/nav-item/releases/download/nav/nav.zip"
DOMAIN=${DOMAIN:-"nav.amossweet.ggff.net"}
PORT=${PORT:-27749}

# ========== 检查环境 ==========
check_env() {
  color_echo yellow "正在检查系统环境..."
  command -v curl >/dev/null 2>&1 || { color_echo yellow "正在安装 curl..."; apt-get update -y && apt-get install -y curl unzip >/dev/null 2>&1; }
  command -v unzip >/dev/null 2>&1 || apt-get install -y unzip >/dev/null 2>&1
  command -v node >/dev/null 2>&1 || {
    color_echo yellow "正在安装 Node.js 18+ ..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs >/dev/null 2>&1
  }
  command -v npm >/dev/null 2>&1 || apt-get install -y npm >/dev/null 2>&1

  mkdir -p "$WORKDIR"
  cd "$WORKDIR" || exit
}

# ========== 下载网站 ==========
download_nav() {
  color_echo yellow "正在下载导航网站程序..."
  curl -L -o nav.zip "$DOWNLOAD_URL" || wget -O nav.zip "$DOWNLOAD_URL"
  unzip -oq nav.zip -d "$WORKDIR"
  rm -f nav.zip
}

# ========== 安装依赖 ==========
install_deps() {
  color_echo yellow "正在安装依赖，请稍等..."
  npm install --silent >/dev/null 2>&1
}

# ========== 启动网站 ==========
start_nav() {
  color_echo yellow "正在启动网站..."
  if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2 >/dev/null 2>&1
  fi

  pm2 delete nav-site >/dev/null 2>&1
  pm2 start app.js --name "nav-site" --env production >/dev/null 2>&1
  pm2 save >/dev/null 2>&1
  pm2 startup >/dev/null 2>&1
}

# ========== 输出信息 ==========
show_info() {
  IP=$(curl -s ipv4.ip.sb || curl -s ifconfig.me)
  color_echo green "\n✅ 导航网站安装成功！"
  echo -e "${green}访问地址：${re}${purple}http://${IP}:${PORT}${re}"
  echo -e "${green}后台管理：${re}${purple}http://${IP}:${PORT}/admin${re}"
  echo -e "${green}账号：${re}${purple}admin${re}"
  echo -e "${green}密码：${re}${purple}123456${re}"
  color_echo yellow "\n⚙️  可使用 pm2 管理服务： pm2 list / pm2 restart nav-site"
}

# ========== 主流程 ==========
main() {
  check_env
  download_nav
  install_deps
  start_nav
  show_info
}

main

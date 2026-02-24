#!/bin/bash
set -e

# ==========================================
# Spread Charts Deployment Script for Rocky 9
# ==========================================

APP_DIR="/var/www/trading-app"
USER_OP=$(whoami)

echo "🚀 Starting deployment on Rocky Linux 9..."

# 1. Update System & Install Dependencies
echo "📦 Installing system dependencies..."
sudo dnf update -y
sudo dnf install -y git curl wget unzip tar nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 2. Install Node.js 20 (LTS)
if ! command -v node &> /dev/null; then
    echo "🟢 Installing Node.js 20..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
else
    echo "✅ Node.js is already installed."
fi

# 3. Setup App Directory
if [ ! -d "$APP_DIR" ]; then
    echo "yping Creating app directory at $APP_DIR..."
    sudo mkdir -p "$APP_DIR"
    sudo chown -R $USER_OP:$USER_OP "$APP_DIR"
    # Ensure current user owns it so we can copy files later without sudo
fi

# 4. Install PM2 Global
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installing PM2..."
    sudo npm install -g pm2
    sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER_OP --hp /home/$USER_OP
fi

# 5. Firewall Setup
echo "fh Firewalld Configuration..."
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload || true

# 6. SELinux Config (Allow Nginx -> Node)
echo "🛡️ Configuring SELinux..."
sudo setsebool -P httpd_can_network_connect 1

echo "✅ Server Setup Complete! Now upload your project files to $APP_DIR"

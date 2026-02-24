# Deployment Implementation Plan: Hosting on Rocky Linux 9.5

This document outlines the steps to deploy the "Spread Charts" trading application on a Rocky Linux 9.5 server.

---

## 1. Prerequisites

Before starting, ensure you have:
*   A **Rocky Linux 9.5 Server** (minimal installation or similar).
*   **Root Access** or a user with `sudo` privileges.
*   **SSH Access** to the server.
*   Your project code uploaded (via Git, SCP, or other method).

---

## 2. Server Preparation

### Update System and Install Essentials
```bash
sudo dnf update -y
sudo dnf install -y git curl wget unzip tar
```

### Install Node.js 18+ (Latest LTS is recommended)
Rocky 9.5 might ship with older Node.js. Use `dnf module` for LTS.
```bash
sudo dnf module list nodejs
sudo dnf module enable nodejs:20 -y  # Or 22 if available, or just use NVM
sudo dnf install -y nodejs npm
```

*Verification:*
```bash
node -v
npm -v
```

### Install Nginx (Web Server & Reverse Proxy)
```bash
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Configure Firewall (firewalld)
Open ports for HTTP (80) and HTTPS (443).
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 3. Application Deployment

### Setup Project Directory
Assume we deploy to `/var/www/trading-app`.
```bash
sudo mkdir -p /var/www/trading-app
sudo chown -R $USER:$USER /var/www/trading-app
cd /var/www/trading-app
```
(Upload your files here or `git clone` your repository.)

### Backend Setup (Server)
1.  Navigate to project root.
2.  Install dependencies:
    ```bash
    npm install --omit=dev  # Production install
    cd server
    # Ensure backend deps are installed if separate (usually shared in root package.json)
    ```
3.  Configure Environment (`.env`):
    Create `.env` inside `server/` (or root, depending on your setup).
    ```bash
    cp .env.example server/.env
    # Edit server/.env with production values (DB URL, API Tokens)
    ```
4.  Install PM2 (Process Manager) globally:
    ```bash
    sudo npm install -g pm2
    ```
5.  Start Backend with PM2:
    ```bash
    pm2 start server/index.js --name "trading-backend"
    pm2 save
    pm2 startup
    # Follow the command output to enable PM2 on boot
    ```

### Frontend Setup (Client)
1.  Navigate to project root.
2.  Build the React/Vite app:
    ```bash
    npm run build
    ```
    This creates a `dist/` folder containing the static files.

---

## 4. Nginx Configuration (Reverse Proxy)

Nginx will serve the frontend files and proxy API requests to the backend (port 3002).

Create a new config file: `/etc/nginx/conf.d/trading-app.conf`

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;  # Replace with actual IP or domain

    root /var/www/trading-app/dist;
    index index.html;

    # Frontend (SPA routing fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Optional: Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

**Test and Reload Nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. SELinux Configuration (Critical for Rocky/RHEL)

Rocky Linux uses SELinux by default, which may block Nginx from connecting to the backend (port 3002).

1.  **Allow Nginx to make network connections (to localhost:3002):**
    ```bash
    sudo setsebool -P httpd_can_network_connect 1
    ```

2.  **Allow Nginx to serve files from your directory (if outside default /usr/share/nginx/html):**
    ```bash
    sudo chcon -Rt httpd_sys_content_t /var/www/trading-app/dist
    ```

---

## 6. Verification

1.  Open your browser and navigate to `http://your_server_ip`.
2.  The Frontend should load.
3.  Check the "Charts" page. Note that the API request will now go to `/api/v2/ohlc` -> Nginx -> `localhost:3002/api/v2/ohlc`.
4.  Inspect Network tab (F12) to ensure no errors.

---

## 7. Maintenance

*   **View Backend Logs:** `pm2 logs trading-backend`
*   **Restart Backend:** `pm2 restart trading-backend`
*   **Update App:**
    ```bash
    git pull
    npm install
    npm run build
    pm2 restart trading-backend
    ```

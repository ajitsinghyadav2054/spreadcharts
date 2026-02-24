$ErrorActionPreference = "Stop"

# --- Configuration ---
$ServerUser = Read-Host "Enter SSH Username (e.g. root/ec2-user)"
$ServerIP = Read-Host "Enter Server IP Address"
$RemoteDir = "/var/www/trading-app"

Write-Host "🚀 Starting Deployment Process..." -ForegroundColor Green

# 1. Build Frontend
Write-Host "📦 Building Frontend..."
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) { throw "Build failed!" }

# 2. Package Files
Write-Host "📦 Zipping Project Files..."
$zipPath = "deploy_package.zip"
# Only zip dist, server, package.json, and setup_remote.sh
Compress-Archive -Path dist, server, package.json, setup_remote.sh -DestinationPath $zipPath -Force

# 3. Upload to Server
Write-Host "📤 Uploading to $ServerIP..."
scp $zipPath "${ServerUser}@${ServerIP}:/tmp/deploy_package.zip"

# 4. Extract & Setup Remote
Write-Host "🔧 Running Remote Setup..."
ssh "${ServerUser}@${ServerIP}" "bash -s" <<EOF
    # Ensure directory exists
    sudo mkdir -p $RemoteDir
    sudo chown -R \$(whoami) $RemoteDir
    
    # Move zip and unzip
    if [ -f /tmp/deploy_package.zip ]; then
        mv /tmp/deploy_package.zip $RemoteDir/
        cd $RemoteDir
        unzip -o deploy_package.zip
        rm deploy_package.zip
        
        # Make setup executable and run it
        chmod +x setup_remote.sh
        # We assume dependencies are handled by setup_remote.sh or separate process
        # But this script installs node deps
        
        echo "📦 Installing Dependencies..."
        npm install --omit=dev  # Production deps only
        cd server
        npm install --omit=dev  # Server deps
        cd ..
        
        # Start Backend
        echo "🚀 Starting PM2..."
        pm2 stop all || true
        pm2 start server/index.js --name "trading-backend"
        pm2 save
        
        # Configure Nginx (Overwrite if exists)
        echo "🌐 Configuring Nginx..."
        sudo tee /etc/nginx/conf.d/trading-app.conf > /dev/null <<NGINX
        server {
            listen 80;
            server_name _;
            root $RemoteDir/dist;
            index index.html;
            location / { try_files \$uri \$uri/ /index.html; }
            location /api/ { proxy_pass http://localhost:3002/api/; }
        }
NGINX

        # Test & Reload Nginx
        sudo nginx -t && sudo systemctl reload nginx
        
        echo "✅ DEPLOYMENT COMPLETE!"
        echo "Access your app at: http://$ServerIP"
    else
        echo "❌ Upload failed, zip file not found."
        exit 1
    fi
EOF

Remove-Item $zipPath
Write-Host "🎉 Done!" -ForegroundColor Green

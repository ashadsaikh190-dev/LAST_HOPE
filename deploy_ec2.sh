#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 1. SYSTEM ENVIRONMENT SETUP ON EC2"
echo "=========================================================="

sudo apt-get update -y
sudo apt-get install -y curl git nginx python3-pip python3-venv build-essential

# Install Node.js 20 LTS
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2
sudo npm install -g pm2

echo "Node.js: $(node -v)"
echo "NPM: $(npm -v)"
echo "PM2: $(pm2 -v)"
echo "Python: $(python3 --version)"

echo "=========================================================="
echo "📦 2. CLONING / UPDATING REPOSITORY"
echo "=========================================================="

APP_DIR="/home/ubuntu/last-hope"

if [ -d "$APP_DIR/.git" ]; then
    echo "Updating existing repository in $APP_DIR..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
else
    echo "Cloning repository into $APP_DIR..."
    git clone https://github.com/ashadsaikh190-dev/LAST_HOPE.git "$APP_DIR"
    cd "$APP_DIR"
fi

echo "=========================================================="
echo "⚙️ 3. CONFIGURING ENVIRONMENT FILES"
echo "=========================================================="

# 3a. Backend .env (if not present)
if [ ! -f "$APP_DIR/backend/.env" ]; then
    cat << 'ENVEOF' > "$APP_DIR/backend/.env"
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/autonomous_admissions
JWT_SECRET=super_secret_jwt_key_autonomous_admissions_2026
REFRESH_TOKEN_SECRET=super_secret_refresh_token_key_2026
SESSION_SECRET=super_secret_session_key_2026
NODE_ENV=production
CORS_ORIGIN=*
AI_SERVICE_URL=http://127.0.0.1:8000
AI_INTERNAL_SECRET=ai_internal_token_secret_key_2026
AWS_REGION=ap-south-1
S3_BUCKET_NAME=prod-admissions-student-documents
DOCUMENT_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/357878953885/prod-document-processing-queue
NOTIFICATION_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/357878953885/prod-notification-queue
SES_FROM_EMAIL=admissions@university.edu
ADMIN_EMAIL=admin@university.edu
MAX_BUDGET_LIMIT=96.87
MONTHLY_BUDGET_LIMIT=96.87
GEMINI_API_KEY=${GEMINI_API_KEY:-""}
ENVEOF
fi

# 3b. AI Agent .env (if not present)
if [ ! -f "$APP_DIR/ai-agent/.env" ]; then
    cat << 'AIENVEOF' > "$APP_DIR/ai-agent/.env"
PORT=8000
BACKEND_URL=http://127.0.0.1:5000
AI_SECRET_KEY=ai_internal_token_secret_key_2026
LLM_API_KEY=${LLM_API_KEY:-""}
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=
GEMINI_API_KEY=${GEMINI_API_KEY:-""}
GEMINI_MODEL=gemini-3.6-flash
EMBEDDING_MODEL=all-MiniLM-L6-v2
ROUTER_CONFIDENCE_THRESHOLD=0.75
ESCALATION_CONFIDENCE_THRESHOLD=0.70
AIENVEOF
fi

echo "=========================================================="
echo "🐍 4. SETTING UP PYTHON AI-AGENT ENVIRONMENT"
echo "=========================================================="

mkdir -p /home/ubuntu/tmp
export TMPDIR=/home/ubuntu/tmp

cd "$APP_DIR/ai-agent"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --no-cache-dir --upgrade pip
pip install --no-cache-dir -r requirements.txt
pip install --no-cache-dir sentence-transformers scikit-learn
deactivate

echo "=========================================================="
echo "☕ 5. BUILDING BACKEND & FRONTEND"
echo "=========================================================="

# Backend dependencies
cd "$APP_DIR/backend"
npm install --production=false

# Frontend build
cd "$APP_DIR/frontend"
npm install
npm run build

echo "=========================================================="
echo "🌐 6. CONFIGURING NGINX REVERSE PROXY"
echo "=========================================================="

sudo tee /etc/nginx/sites-available/last-hope << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    # Client body size for document uploads
    client_max_body_size 50M;

    # Frontend React Static Files
    root /home/ubuntu/last-hope/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health API
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Uploads directory
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Socket.io realtime events
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Direct AI Agent API (if needed)
    location /ai/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINXEOF

# Enable site and remove default
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/last-hope /etc/nginx/sites-enabled/last-hope
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "=========================================================="
echo "🚀 7. STARTING SERVICES VIA PM2"
echo "=========================================================="

cd "$APP_DIR"

# Stop any previous instances
pm2 delete last-hope-backend 2>/dev/null || true
pm2 delete last-hope-ai-agent 2>/dev/null || true

# Start backend
cd "$APP_DIR/backend"
pm2 start server.js --name "last-hope-backend"

# Start Python AI-agent with venv uvicorn
cd "$APP_DIR/ai-agent"
pm2 start "venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000" --name "last-hope-ai-agent"

pm2 save

echo "=========================================================="
echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=========================================================="
pm2 status

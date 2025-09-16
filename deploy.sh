#!/bin/bash

# Football API Server Deployment Script for Ubuntu EC2
# Author: AI Assistant
# Description: Script to deploy Football API Server on Ubuntu EC2 with Docker

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        error "Please do not run this script as root. Use a regular user with sudo privileges."
        exit 1
    fi
}

# Function to update system
update_system() {
    log "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    log "System updated successfully"
}

# Function to install Docker
install_docker() {
    if command -v docker >/dev/null 2>&1; then
        log "Docker is already installed"
        docker --version
    else
        log "Installing Docker..."

        # Remove old versions
        sudo apt-get remove -y docker docker-engine docker.io containerd runc

        # Install dependencies
        sudo apt-get install -y \
            ca-certificates \
            curl \
            gnupg \
            lsb-release

        # Add Docker's official GPG key
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

        # Set up repository
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

        # Install Docker Engine
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

        # Add user to docker group
        sudo usermod -aG docker $USER

        log "Docker installed successfully"
    fi
}

# Function to install Docker Compose
install_docker_compose() {
    if command -v docker-compose >/dev/null 2>&1; then
        log "Docker Compose is already installed"
        docker-compose --version
    else
        log "Installing Docker Compose..."

        # Install latest version
        LATEST_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')
        sudo curl -L "https://github.com/docker/compose/releases/download/${LATEST_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose

        log "Docker Compose installed successfully"
    fi
}

# Function to install additional tools
install_tools() {
    log "Installing additional tools..."
    sudo apt-get install -y \
        git \
        curl \
        wget \
        vim \
        htop \
        ufw \
        fail2ban \
        certbot
    log "Additional tools installed"
}

# Function to configure firewall
configure_firewall() {
    log "Configuring UFW firewall..."

    # Reset to default
    sudo ufw --force reset

    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing

    # Allow SSH (important!)
    sudo ufw allow ssh
    sudo ufw allow 22/tcp

    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp

    # Allow our API port
    sudo ufw allow 3001/tcp

    # Enable firewall
    sudo ufw --force enable

    log "Firewall configured successfully"
}

# Function to create application directory
setup_app_directory() {
    APP_DIR="/home/$USER/football-api"

    log "Setting up application directory at $APP_DIR"

    if [ -d "$APP_DIR" ]; then
        warn "Directory $APP_DIR already exists. Backing up..."
        sudo mv "$APP_DIR" "$APP_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    mkdir -p "$APP_DIR"
    cd "$APP_DIR"

    log "Application directory created: $APP_DIR"
}

# Function to create environment file
create_env_file() {
    log "Creating environment file..."

    cat > .env << EOF
# Football API Server Environment Configuration
NODE_ENV=production
PORT=3001

# Puppeteer configurations
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu

# API configurations
API_CACHE_DURATION=120000
API_TIMEOUT=30000

# Redis password (change this!)
REDIS_PASSWORD=footballapi$(date +%s)

# Log level
LOG_LEVEL=info

# Domain (change this to your domain)
DOMAIN=your-domain.com
EOF

    log "Environment file created. Please edit .env file with your settings."
}

# Function to create nginx configuration
create_nginx_config() {
    log "Creating Nginx configuration..."

    cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream football_api {
        server football-api:3001;
    }

    server {
        listen 80;
        server_name _;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # API routes
        location / {
            proxy_pass http://football_api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeout settings
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

    log "Nginx configuration created"
}

# Function to create systemd service
create_systemd_service() {
    log "Creating systemd service..."

    sudo tee /etc/systemd/system/football-api.service > /dev/null << EOF
[Unit]
Description=Football API Server
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable football-api.service

    log "Systemd service created and enabled"
}

# Function to create monitoring script
create_monitoring_script() {
    log "Creating monitoring script..."

    cat > monitor.sh << 'EOF'
#!/bin/bash

# Football API Monitoring Script

APP_DIR="/home/$USER/football-api"
LOG_FILE="$APP_DIR/logs/monitor.log"

# Create logs directory
mkdir -p "$APP_DIR/logs"

# Function to log with timestamp
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if containers are running
check_containers() {
    cd "$APP_DIR"

    if ! docker-compose ps | grep -q "Up"; then
        log_message "ERROR: Containers are not running. Attempting to restart..."
        docker-compose down
        docker-compose up -d
        sleep 10
    fi
}

# Check API health
check_api_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)

    if [ "$response" != "200" ]; then
        log_message "ERROR: API health check failed (HTTP $response). Restarting containers..."
        cd "$APP_DIR"
        docker-compose restart football-api
        sleep 10
    else
        log_message "INFO: API health check passed"
    fi
}

# Clean up old logs (keep last 7 days)
cleanup_logs() {
    find "$APP_DIR/logs" -name "*.log" -type f -mtime +7 -delete
}

# Main monitoring
log_message "Starting monitoring check..."
check_containers
check_api_health
cleanup_logs
log_message "Monitoring check completed"
EOF

    chmod +x monitor.sh

    # Add to crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/monitor.sh") | crontab -

    log "Monitoring script created and added to crontab"
}

# Main deployment function
main() {
    log "Starting Football API Server deployment on Ubuntu EC2..."

    # Check if not running as root
    check_root

    # Get current directory to copy files from
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

    # System setup
    update_system
    install_docker
    install_docker_compose
    install_tools
    configure_firewall

    # Application setup
    setup_app_directory

    # Copy project files
    if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        log "Copying project files..."
        cp -r "$SCRIPT_DIR"/* "$APP_DIR/" 2>/dev/null || true
        cp -r "$SCRIPT_DIR"/.* "$APP_DIR/" 2>/dev/null || true
    else
        warn "Project files not found in script directory. You'll need to upload them manually."
    fi

    create_env_file
    create_nginx_config
    create_systemd_service
    create_monitoring_script

    # Build and start services
    log "Building and starting services..."
    cd "$APP_DIR"
    docker-compose build
    docker-compose up -d

    # Check if services are running
    sleep 10
    if docker-compose ps | grep -q "Up"; then
        log "Services started successfully!"

        # Show status
        docker-compose ps

        info "=== Deployment Complete ==="
        info "API Server: http://$(curl -s ifconfig.me):3001"
        info "Web Server: http://$(curl -s ifconfig.me)"
        info "Monitoring: http://$(curl -s ifconfig.me):9000 (Portainer)"
        info ""
        info "Next steps:"
        info "1. Edit .env file with your settings"
        info "2. Configure your domain in nginx.conf"
        info "3. Set up SSL certificate with: sudo certbot --nginx"
        info "4. Monitor logs with: docker-compose logs -f"
        info ""
        warn "Important: Change the REDIS_PASSWORD in .env file!"

    else
        error "Services failed to start. Check logs with: docker-compose logs"
        exit 1
    fi

    log "Deployment completed successfully!"
}

# Run main function
main "$@"

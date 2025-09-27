module.exports = {
  apps: [{
    name: 'football-api-server',
    script: './server.js',
    instances: 1, // หรือใช้ 'max' สำหรับ multi-core
    exec_mode: 'fork', // หรือ 'cluster' สำหรับ load balancing
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: false,
      PUPPETEER_EXECUTABLE_PATH: '/usr/bin/google-chrome-stable'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 8080,
      watch: true,
      ignore_watch: ['node_modules', 'logs'],
      watch_options: {
        followSymlinks: false
      }
    },
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto restart
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Health monitoring
    health_check_grace_period: 3000
  }]
};
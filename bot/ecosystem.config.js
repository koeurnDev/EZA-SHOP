module.exports = {
  apps: [
    {
      name: 'momo-bot-backend',
      script: 'server.js',
      instances: 'max', // Utilizes all available CPU cores
      exec_mode: 'cluster', // Enables cluster mode for load balancing
      watch: false, // Don't watch files in production (saves CPU)
      max_memory_restart: '1G', // Auto-restart if memory exceeds 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true, // Prefix logs with timestamps
      autorestart: true,
      exp_backoff_restart_delay: 100 // Delay between restarts
    }
  ]
};

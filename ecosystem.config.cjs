module.exports = {
  apps: [
    {
      name: 'meu-sistema-saas',
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};

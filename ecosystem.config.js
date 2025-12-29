
 module.exports = {
    apps: [{
      name: 'cay-worker',
      script: './apps/worker/index.js',
      env_production: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres.ddvdistashhhxejpyiho:nbcbgofuckyourself@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
UPSTASH_REDIS_REST_URL:"https://cheerful-sailfish-55901.upstash.io",
UPSTASH_REDIS_REST_TOKEN:"AdpdAAIncDFiMjVlOGE1ODYxYTE0NDUxYjI1ZWZiYzc4NzQxMjIzOXAxNTU5MDE",
REDIS_URL:"rediss://default:AdpdAAIncDFiMjVlOGE1ODYxYTE0NDUxYjI1ZWZiYzc4NzQxMjIzOXAxNTU5MDE@cheerful-sailfish-55901.upstash.io:6379"
      },
      max_memory_restart: '500M',
      autorestart: true,
      watch: false
    }]
  };

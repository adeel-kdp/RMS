const Bull = require('bull');
const Redis = require('ioredis');
const url = require('url');

const redisUrl = process.env.REDIS_URL;
const parsedUrl = new url.URL(redisUrl);

const redisConfig = {
  host: parsedUrl.hostname,
  port: parsedUrl.port,
  password: parsedUrl.password || undefined,
  maxRetriesPerRequest: null,
};

const orderQueue = new Bull( 'orderProcessing', {
  createClient: () => new Redis(redisConfig),
  limiter: {
    max: 1000,
    duration: 5000,
  }, 
});
orderQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

module.exports = { orderQueue };

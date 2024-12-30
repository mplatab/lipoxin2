const Queue = require('bull');
const logger = require('../utils/logger');

const queueConfig = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true
  },
  settings: {
    lockDuration: 30000,
    stalledInterval: 30000,
    maxStalledCount: 1
  }
};

const createQueue = (name) => {
  const queue = new Queue(name, process.env.REDIS_URL, {
    settings: queueConfig.settings
  });

  queue.on('error', (error) => {
    logger.error(`Queue ${name} error:`, error);
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} in queue ${name} failed:`, error);
  });

  queue.on('completed', (job) => {
    logger.info(`Job ${job.id} in queue ${name} completed`);
  });

  return queue;
};

module.exports = {
  createQueue,
  queueConfig
};
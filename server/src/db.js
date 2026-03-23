const { PrismaClient } = require('@prisma/client');

const prismaLogLevels =
  process.env.PRISMA_LOG_QUERIES === 'true'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'];

const prisma = new PrismaClient({
  log: prismaLogLevels,
});

module.exports = prisma;

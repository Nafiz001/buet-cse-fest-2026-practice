const { PrismaClient } = require('@prisma/client');
const logger = require('./utils/logger');

const prisma = new PrismaClient();

async function initializeDatabase() {
  try {
    logger.info('Checking database connection...');
    
    await prisma.$connect();
    logger.info('✓ Database connection established');

    const count = await prisma.ambulance.count();
    logger.info({ count }, '✓ Database schema is ready');

    if (count === 0) {
      logger.info('Creating sample ambulances...');
      
      await prisma.ambulance.createMany({
        data: [
          {
            licensePlate: 'DH-001',
            city: 'dhaka',
            capacity: 2,
            status: 'available'
          },
          {
            licensePlate: 'DH-002',
            city: 'dhaka',
            capacity: 2,
            status: 'available'
          },
          {
            licensePlate: 'CH-001',
            city: 'chittagong',
            capacity: 2,
            status: 'available'
          },
          {
            licensePlate: 'CH-002',
            city: 'chittagong',
            capacity: 1,
            status: 'available'
          }
        ]
      });
      
      logger.info('✓ Sample ambulances created');
    }

    await prisma.$disconnect();
    logger.info('Database initialization complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Database initialization failed');
    logger.error('Make sure to run: npx prisma migrate deploy');
    process.exit(1);
  }
}

initializeDatabase();

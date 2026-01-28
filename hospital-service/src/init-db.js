const { PrismaClient } = require('@prisma/client');
const logger = require('./utils/logger');

const prisma = new PrismaClient();

async function initializeDatabase() {
  try {
    logger.info('Checking database connection...');
    
    // Test connection
    await prisma.$connect();
    logger.info('✓ Database connection established');

    // Check if tables exist by trying to count hospitals
    const count = await prisma.hospital.count();
    logger.info({ count }, '✓ Database schema is ready');

    // If no hospitals exist, create some sample data
    if (count === 0) {
      logger.info('Creating sample hospitals...');
      
      await prisma.hospital.createMany({
        data: [
          {
            name: 'Dhaka Medical College Hospital',
            city: 'dhaka',
            icuBeds: 50,
            ventilators: 30
          },
          {
            name: 'Chittagong Medical College Hospital',
            city: 'chittagong',
            icuBeds: 40,
            ventilators: 25
          },
          {
            name: 'Rajshahi Medical College Hospital',
            city: 'rajshahi',
            icuBeds: 35,
            ventilators: 20
          },
          {
            name: 'Khulna Medical College Hospital',
            city: 'khulna',
            icuBeds: 30,
            ventilators: 18
          }
        ]
      });
      
      logger.info('✓ Sample hospitals created');
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

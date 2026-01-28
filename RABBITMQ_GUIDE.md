# RabbitMQ Integration Guide

## Overview

This guide explains how to integrate RabbitMQ for asynchronous messaging in the CityCare platform. RabbitMQ enables decoupling of services and handles high-load scenarios efficiently.

## Use Cases

1. **Emergency Request Processing** - Queue incoming emergency requests
2. **Resource Allocation Events** - Notify services when resources change
3. **Audit Logging** - Asynchronous logging of critical events
4. **Notifications** - Send alerts to ambulances and hospitals

## Installation

Add the RabbitMQ client to your service:

```bash
npm install amqplib
```

## Basic Setup

### 1. Connection Manager (`lib/rabbitmq.js`)

```javascript
const amqp = require('amqplib');
const logger = require('./logger');

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  async connect(url) {
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;

      this.connection.on('error', (err) => {
        logger.error({ err }, 'RabbitMQ connection error');
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        // Reconnect after 5 seconds
        setTimeout(() => this.connect(url), 5000);
      });

      logger.info('Connected to RabbitMQ');
      return this.channel;
    } catch (error) {
      logger.error({ error }, 'Failed to connect to RabbitMQ');
      setTimeout(() => this.connect(url), 5000);
    }
  }

  async assertQueue(queueName, options = {}) {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }
    return await this.channel.assertQueue(queueName, {
      durable: true,
      ...options
    });
  }

  async assertExchange(exchangeName, type, options = {}) {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }
    return await this.channel.assertExchange(exchangeName, type, {
      durable: true,
      ...options
    });
  }

  getChannel() {
    return this.channel;
  }

  async close() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.isConnected = false;
    } catch (error) {
      logger.error({ error }, 'Error closing RabbitMQ connection');
    }
  }
}

module.exports = new RabbitMQConnection();
```

### 2. Publisher Service (`services/publisher.js`)

```javascript
const rabbitmq = require('../lib/rabbitmq');
const logger = require('../lib/logger');

class MessagePublisher {
  constructor() {
    this.EXCHANGES = {
      EMERGENCY: 'emergency.events',
      RESOURCE: 'resource.updates',
      AUDIT: 'audit.logs'
    };
  }

  async initialize() {
    const channel = await rabbitmq.connect(process.env.RABBITMQ_URL);
    
    // Setup exchanges
    await rabbitmq.assertExchange(this.EXCHANGES.EMERGENCY, 'topic');
    await rabbitmq.assertExchange(this.EXCHANGES.RESOURCE, 'fanout');
    await rabbitmq.assertExchange(this.EXCHANGES.AUDIT, 'topic');
    
    logger.info('Publisher initialized');
  }

  async publishEmergencyRequest(request) {
    const channel = rabbitmq.getChannel();
    const routingKey = `emergency.${request.priority}.${request.type}`;
    
    const message = {
      id: request.id,
      timestamp: new Date().toISOString(),
      data: request
    };

    channel.publish(
      this.EXCHANGES.EMERGENCY,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: request.id
      }
    );

    logger.info({ requestId: request.id, routingKey }, 'Published emergency request');
  }

  async publishResourceUpdate(resource, action) {
    const channel = rabbitmq.getChannel();
    
    const message = {
      timestamp: new Date().toISOString(),
      resource,
      action // 'allocated', 'released', 'updated'
    };

    channel.publish(
      this.EXCHANGES.RESOURCE,
      '',
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: 'application/json'
      }
    );

    logger.info({ resource, action }, 'Published resource update');
  }

  async publishAuditLog(event) {
    const channel = rabbitmq.getChannel();
    const routingKey = `audit.${event.service}.${event.action}`;
    
    const message = {
      timestamp: new Date().toISOString(),
      ...event
    };

    channel.publish(
      this.EXCHANGES.AUDIT,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: 'application/json'
      }
    );
  }
}

module.exports = new MessagePublisher();
```

### 3. Consumer Service (`services/consumer.js`)

```javascript
const rabbitmq = require('../lib/rabbitmq');
const logger = require('../lib/logger');

class MessageConsumer {
  constructor() {
    this.QUEUES = {
      EMERGENCY_HIGH: 'emergency.high.priority',
      EMERGENCY_NORMAL: 'emergency.normal.priority',
      RESOURCE_UPDATES: 'resource.updates',
      AUDIT_LOGS: 'audit.logs'
    };
  }

  async initialize() {
    await rabbitmq.connect(process.env.RABBITMQ_URL);
    
    // Setup queues
    await rabbitmq.assertQueue(this.QUEUES.EMERGENCY_HIGH, {
      durable: true,
      arguments: { 'x-max-priority': 10 }
    });
    
    await rabbitmq.assertQueue(this.QUEUES.EMERGENCY_NORMAL, {
      durable: true,
      arguments: { 'x-max-priority': 5 }
    });

    await rabbitmq.assertQueue(this.QUEUES.RESOURCE_UPDATES, { durable: true });
    await rabbitmq.assertQueue(this.QUEUES.AUDIT_LOGS, { durable: true });

    // Bind queues to exchanges
    const channel = rabbitmq.getChannel();
    
    await channel.bindQueue(
      this.QUEUES.EMERGENCY_HIGH,
      'emergency.events',
      'emergency.high.*'
    );
    
    await channel.bindQueue(
      this.QUEUES.EMERGENCY_NORMAL,
      'emergency.events',
      'emergency.normal.*'
    );
    
    await channel.bindQueue(
      this.QUEUES.RESOURCE_UPDATES,
      'resource.updates',
      ''
    );

    await channel.bindQueue(
      this.QUEUES.AUDIT_LOGS,
      'audit.logs',
      'audit.#'
    );

    logger.info('Consumer initialized');
  }

  async consumeEmergencyRequests(handler) {
    const channel = rabbitmq.getChannel();
    
    // High priority queue
    channel.consume(
      this.QUEUES.EMERGENCY_HIGH,
      async (msg) => {
        if (msg !== null) {
          try {
            const content = JSON.parse(msg.content.toString());
            logger.info({ requestId: content.id }, 'Processing high priority emergency');
            
            await handler(content);
            channel.ack(msg);
          } catch (error) {
            logger.error({ error }, 'Error processing emergency request');
            // Reject and requeue after 3 attempts
            const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
            if (retryCount < 3) {
              channel.nack(msg, false, true);
            } else {
              channel.nack(msg, false, false); // Send to dead letter queue
            }
          }
        }
      },
      { noAck: false }
    );

    // Normal priority queue
    channel.consume(
      this.QUEUES.EMERGENCY_NORMAL,
      async (msg) => {
        if (msg !== null) {
          try {
            const content = JSON.parse(msg.content.toString());
            logger.info({ requestId: content.id }, 'Processing normal priority emergency');
            
            await handler(content);
            channel.ack(msg);
          } catch (error) {
            logger.error({ error }, 'Error processing emergency request');
            channel.nack(msg, false, true);
          }
        }
      },
      { noAck: false }
    );
  }

  async consumeResourceUpdates(handler) {
    const channel = rabbitmq.getChannel();
    
    channel.consume(
      this.QUEUES.RESOURCE_UPDATES,
      async (msg) => {
        if (msg !== null) {
          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);
            channel.ack(msg);
          } catch (error) {
            logger.error({ error }, 'Error processing resource update');
            channel.nack(msg, false, true);
          }
        }
      },
      { noAck: false }
    );
  }

  async consumeAuditLogs(handler) {
    const channel = rabbitmq.getChannel();
    
    channel.consume(
      this.QUEUES.AUDIT_LOGS,
      async (msg) => {
        if (msg !== null) {
          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);
            channel.ack(msg);
          } catch (error) {
            logger.error({ error }, 'Error processing audit log');
            channel.ack(msg); // Don't requeue audit logs
          }
        }
      },
      { noAck: false, prefetch: 100 }
    );
  }
}

module.exports = new MessageConsumer();
```

### 4. Integration in Express Server

```javascript
const express = require('express');
const publisher = require('./services/publisher');
const consumer = require('./services/consumer');
const rabbitmq = require('./lib/rabbitmq');

const app = express();
app.use(express.json());

// Initialize RabbitMQ
async function initializeMessaging() {
  await publisher.initialize();
  await consumer.initialize();
  
  // Start consuming messages
  await consumer.consumeEmergencyRequests(async (request) => {
    // Handle emergency request
    console.log('Processing emergency:', request);
  });
  
  await consumer.consumeResourceUpdates(async (update) => {
    // Handle resource update
    console.log('Resource updated:', update);
  });
}

// Emergency request endpoint
app.post('/api/emergency', async (req, res) => {
  try {
    const request = req.body;
    
    // Publish to RabbitMQ instead of synchronous processing
    await publisher.publishEmergencyRequest(request);
    
    res.status(202).json({
      message: 'Emergency request queued',
      requestId: request.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to queue request' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    rabbitmq: rabbitmq.isConnected
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await rabbitmq.close();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeMessaging();
});
```

## Advanced Patterns

### Dead Letter Queue (DLQ)

```javascript
// Setup dead letter exchange
await channel.assertExchange('dlx', 'topic', { durable: true });
await channel.assertQueue('dead.letters', { durable: true });
await channel.bindQueue('dead.letters', 'dlx', '#');

// Create queue with DLQ
await channel.assertQueue('emergency.high.priority', {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'dlx',
    'x-dead-letter-routing-key': 'emergency.failed',
    'x-message-ttl': 300000 // 5 minutes
  }
});
```

### Rate Limiting

```javascript
// Limit consumers to process 10 messages at a time
channel.prefetch(10);
```

### Message Priority

```javascript
// Send high priority message
channel.sendToQueue('emergency.queue', Buffer.from(JSON.stringify(data)), {
  priority: 10,
  persistent: true
});
```

## Monitoring

Access RabbitMQ Management UI:
```
http://localhost:15672
Username: citycare
Password: citycare123
```

## Best Practices

1. **Always acknowledge messages** - Use `channel.ack()` or `channel.nack()`
2. **Handle failures gracefully** - Implement retry logic with max attempts
3. **Use persistent messages** - Set `persistent: true` for critical messages
4. **Implement circuit breakers** - Prevent cascading failures
5. **Monitor queue depths** - Alert on growing backlogs
6. **Use appropriate exchange types**:
   - `direct`: Point-to-point routing
   - `topic`: Pattern-based routing
   - `fanout`: Broadcast to all queues
   - `headers`: Header-based routing

## Testing

```javascript
// Test publisher
const testRequest = {
  id: 'test-123',
  priority: 'high',
  type: 'cardiac',
  location: { lat: 23.7, lng: 90.4 }
};

await publisher.publishEmergencyRequest(testRequest);
```

## Troubleshooting

### Connection Issues
- Check `RABBITMQ_URL` environment variable
- Verify RabbitMQ container is running: `docker ps | grep rabbitmq`
- Check logs: `docker logs citycare-rabbitmq`

### Message Not Consumed
- Verify queue bindings: Check RabbitMQ Management UI
- Check consumer prefetch settings
- Verify message format and routing keys

### Performance Issues
- Increase `worker_processes` in Nginx
- Scale consumer instances using Docker Compose
- Use connection pooling with `keepalive`

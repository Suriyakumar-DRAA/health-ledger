import amqplib, { ChannelModel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { config } from '@config/index';
import { logger } from '@utils/logger';

class RabbitMQManager {
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  async connect(): Promise<void> {
    try {
      // connect() returns ChannelModel in amqplib ≥ 0.10
      this.connection = await amqplib.connect(config.rabbitmq.uri);

      // createConfirmChannel() gives us publish acknowledgements
      this.channel = await this.connection.createConfirmChannel();

      // Set QoS prefetch limit
      await this.channel.prefetch(config.rabbitmq.prefetch);

      // Assert the main topic exchange
      await this.channel.assertExchange(
        config.rabbitmq.exchange,
        config.rabbitmq.exchangeType,
        { durable: true },
      );

      this.connection.on('error', (err: Error) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        this.scheduleReconnect();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed — reconnecting...');
        this.scheduleReconnect();
      });

      logger.info('RabbitMQ connected', {
        exchange:     config.rabbitmq.exchange,
        exchangeType: config.rabbitmq.exchangeType,
      });
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', { error });
      process.exit(1);
    }
  }

  private scheduleReconnect(): void {
    // Null out stale references before reconnecting
    this.channel    = null;
    this.connection = null;

    setTimeout(() => {
      logger.info('RabbitMQ attempting reconnection...');
      this.connect().catch((err) =>
        logger.error('RabbitMQ reconnect failed', { error: err }),
      );
    }, 5000);
  }

  private getChannel(): ConfirmChannel {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');
    return this.channel;
  }

  // ─────────────────────────────────────────────
  //  PUBLISH  (with broker confirmation)
  // ─────────────────────────────────────────────

  async publish<T>(routingKey: string, payload: T): Promise<void> {
    const channel = this.getChannel();
    const buffer  = Buffer.from(JSON.stringify(payload));

    return new Promise<void>((resolve, reject) => {
      channel.publish(
        config.rabbitmq.exchange,
        routingKey,
        buffer,
        {
          persistent:  true,
          contentType: 'application/json',
          timestamp:   Math.floor(Date.now() / 1000),
        },
        (err) => {
          if (err) {
            logger.error('RabbitMQ publish NACK', { routingKey, error: err.message });
            return reject(err);
          }
          logger.debug('RabbitMQ message published', { routingKey });
          resolve();
        },
      );
    });
  }

  // ─────────────────────────────────────────────
  //  CONSUME
  // ─────────────────────────────────────────────

  async consume<T>(
    queueName:  string,
    routingKey: string,
    handler:    (payload: T) => Promise<void>,
  ): Promise<void> {
    const channel = this.getChannel();

    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, config.rabbitmq.exchange, routingKey);

    await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString()) as T;
        await handler(payload);
        channel.ack(msg);
        logger.debug('RabbitMQ message consumed', { queueName, routingKey });
      } catch (error) {
        logger.error('RabbitMQ message processing failed', { queueName, error });
        // nack with requeue=false → routes to dead-letter queue if configured
        channel.nack(msg, false, false);
      }
    });

    logger.info('RabbitMQ consumer registered', { queueName, routingKey });
  }

  // ─────────────────────────────────────────────
  //  DISCONNECT
  // ─────────────────────────────────────────────

  async disconnect(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel    = null;
    this.connection = null;
    logger.info('RabbitMQ disconnected cleanly');
  }
}

export const rabbitMQ = new RabbitMQManager();
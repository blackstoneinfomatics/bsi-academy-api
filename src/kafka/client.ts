import { Kafka } from "kafkajs";

export const kafka = new Kafka({
  clientId: "erp-backend",
 brokers: [process.env.KAFKA_BROKER ?? "kafka:9092"],
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

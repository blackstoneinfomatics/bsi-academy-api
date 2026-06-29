import { CompressionTypes, Partitioners } from "kafkajs";
import { kafka } from "./client";

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});


export const connectProducer = async ()=>{
  await producer.connect();
  console.log("producer connected");
}

export const disconnectProducer = async () =>{
  await producer.disconnect();
  console.log("producer disconnected");
}

export const sendMessage = async (topic: string, message: any) => {
  try {
    const value = JSON.stringify(message);
    await producer.send({
      topic,
      messages: [{ value }],
      compression: CompressionTypes.GZIP,
    });
    console.log(`📤 Kafka Producer sent to topic: ${topic}`);
  } catch (err) {
    console.error("❌ Kafka Producer Error:", err);
  }
};


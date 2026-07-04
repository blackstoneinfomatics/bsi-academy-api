// consumers/invoiceConsumer.ts

import { kafka } from './client';
import { topicHandler } from './topicHandlerMap';

const consumer = kafka.consumer({ groupId: 'Alfurqan' });

export const startInvoiceConsumer = async () => {
  await consumer.connect();
  console.log("kakfa consumer is connected");

  for(const topic of Object.keys(topicHandler)){
    await consumer.subscribe({topic , fromBeginning : false});
    console.log(`topic is ruunning of ${topic}`);
  }
  await consumer.run({
    eachMessage : async({topic , message})=>{
      if(!message.value) return;
      try{
        const raw = message.value?.toString();
        const data = JSON.parse(raw);
        const handler = topicHandler[topic];
        if(handler){
          await handler(data);
        }else{
          console.log(`No handler in name of  ${topic}`);
        }
      }catch(error){
        console.log("kafka error",error)
      }
    }
  });
};

export const shutdownKafkaConsumer = async()=>{
  await consumer.disconnect();
  console.log('consumer disconneted');
}



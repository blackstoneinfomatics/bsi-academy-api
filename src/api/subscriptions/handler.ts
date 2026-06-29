import { ResponseToolkit,Request } from "@hapi/hapi";
import Subscriptions from "../../models/subscription"


interface SubscriptionPayload {
    subscriptionName: string;
    subscriptionPricePerHr: string;
    subscriptionDays: string;
    subscriptionStartDate: string;
    subscriptionEndDate: string;
    status: number;
    createdDate: string;
    createdBy: string;
    lastUpdatedBy: string;
}

export default {

    // Create a new user
    async createSubscription(req: Request, h: ResponseToolkit) {
      const payload = req.payload as SubscriptionPayload ;
  
      const {
     subscriptionName,
     subscriptionPricePerHr,
     subscriptionDays,
     subscriptionStartDate,
     subscriptionEndDate,
     status,
      createdDate,
      createdBy,
      lastUpdatedBy
      } = payload;
  
      //const hashedPassword = await hashPassword(decryptPassword(password));
  
      return createSubscriptionPlan({
        subscriptionName,
        subscriptionPricePerHr,
        subscriptionDays,
        subscriptionStartDate,
        subscriptionEndDate,
        status,
        createdDate,
        createdBy,
        lastUpdatedBy
      });
    },
  
  
    // Delete user by userI
  
  
  
  };

async function createSubscriptionPlan(arg0: { subscriptionName: string; subscriptionPricePerHr: string; subscriptionDays: string; subscriptionStartDate: string; subscriptionEndDate: string; status: number; createdDate: string; createdBy: string; lastUpdatedBy: string; }) {
    const subscriptionDetails = await Subscriptions.create(arg0);
  console.log(subscriptionDetails);
  return subscriptionDetails;
}


import { ResponseToolkit, Request } from "@hapi/hapi";
import { getActiveTenantSubscriptionRecord } from "../../operations/tenantSubscription.";


export default {
   async getTenantSubscriptionDetails(req: Request, h: ResponseToolkit) {
    return getActiveTenantSubscriptionRecord();
  },
  
 


};

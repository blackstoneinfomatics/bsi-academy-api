import tenantsubscription from "../models/tenantsubscription";

export const getActiveTenantSubscriptionRecord = async () => {
  const tenants = await tenantsubscription.find({}).lean();
  return {
    total: tenants.length,  
    tenants,
    
  };
};
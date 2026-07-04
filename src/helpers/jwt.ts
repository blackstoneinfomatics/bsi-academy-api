import { isNil, isEmpty } from "lodash";
import { Request } from "@hapi/hapi";
import { getActiveUserRecord } from "../operations/users";
import { getActiveTenantRecordByCode } from "../operations/tenants";
import { getActiveSessionRecord } from "../operations/active_session";

export const validateUserAuth = async (decoded: string, req: Request) => {

  const { tenantid, authorization } = req.headers;
  const token = authorization.replace("Bearer ", "");

  if (!isNil(decoded) && !isEmpty(decoded)) {
    const { tenantId, sub }: any = decoded;

    const user = await getActiveUserRecord({ id: sub, tenantId });

    const tenant = await getActiveTenantRecordByCode(tenantId);
    const activeSession = await getActiveSessionRecord({
      accessToken: token,
      isActive: true,
      userId: sub,
      tenantId,
    });
    if (
      tenantid !== tenantId ||
      isNil(user) ||
      isNil(tenant) ||
      isNil(activeSession)
    ) {
      return { isValid: false };
    }
    return { isValid: true };
  } else {
    return { isValid: false };
  }
};

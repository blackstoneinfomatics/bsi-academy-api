import { isNil, isEmpty } from "lodash";
import { Request } from "@hapi/hapi";
import { getActiveUserRecord } from "../operations/users";
import { getActiveSessionRecord } from "../operations/active_session";
import TenantModel from "../models/tenants";
import TrialMemberModel from "../models/trailmember";
import { appStatus } from "../config/messages";
import { Status } from "../shared/enum";

export const validateUserAuth = async (
  decoded: Record<string, unknown>,
  req: Request
) => {

  const { tenantid, authorization } = req.headers;
  const token = authorization.replace("Bearer ", "");

  if (!isNil(decoded) && !isEmpty(decoded)) {
    const { tenantId, sub } = decoded;
    if (typeof tenantId !== "string" || typeof sub !== "string") {
      return { isValid: false };
    }

    const user = await getActiveUserRecord({ id: sub, tenantId });
    const trialMember = user
      ? null
      : await TrialMemberModel.findOne({
          _id: sub,
          tenantId,
          status: appStatus.ACTIVE,
        }).lean();

    const tenant = await TenantModel.findOne({
      tenantCode: tenantId,
      status: { $in: [appStatus.ACTIVE, Status.TRIAL] },
    }).lean();
    const activeSession = await getActiveSessionRecord({
      accessToken: token,
      isActive: true,
      userId: sub,
      tenantId,
    });
    if (
      tenantid !== tenantId ||
      (isNil(user) && isNil(trialMember)) ||
      isNil(tenant) ||
      isNil(activeSession)
    ) {
      return { isValid: false };
    }
    return {
      isValid: true,
      credentials: {
        sub,
        tenantId,
        ...(typeof decoded.userName === "string"
          ? { userName: decoded.userName }
          : {}),
      },
    };
  } else {
    return { isValid: false };
  }
};

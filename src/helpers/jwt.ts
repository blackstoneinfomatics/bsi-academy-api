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
  console.info("[auth:jwt] Validation started", {
    authorizationHeaderPresent: typeof authorization === "string",
    tenantHeaderPresent: typeof tenantid === "string",
  });

  if (!isNil(decoded) && !isEmpty(decoded)) {
    const { tenantId, sub } = decoded;
    if (typeof tenantId !== "string" || typeof sub !== "string") {
      console.warn("[auth:jwt] Validation failed: required token claims missing", {
        tenantIdPresent: typeof tenantId === "string",
        subjectPresent: typeof sub === "string",
      });
      return { isValid: false };
    }

    if (typeof authorization !== "string") {
      console.warn("[auth:jwt] Validation failed: authorization header missing");
      return { isValid: false };
    }

    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token || token === authorization) {
      console.warn("[auth:jwt] Validation failed: bearer token missing or malformed");
      return { isValid: false };
    }

    console.info("[auth:jwt] Required token claims validated");
    const user = await getActiveUserRecord({ id: sub, tenantId });
    console.info("[auth:jwt] User lookup completed", { found: !isNil(user) });

    const trialMember = user
      ? null
      : await TrialMemberModel.findOne({
          _id: sub,
          tenantId,
          status: appStatus.ACTIVE,
        }).lean();
    if (!user) {
      console.info("[auth:jwt] Trial member lookup completed", {
        found: !isNil(trialMember),
      });
    }

    const tenant = await TenantModel.findOne({
      tenantCode: tenantId,
      status: { $in: [appStatus.ACTIVE, Status.TRIAL] },
    }).lean();
    console.info("[auth:jwt] Tenant lookup completed", {
      found: !isNil(tenant),
    });

    const activeSession = await getActiveSessionRecord({
      accessToken: token,
      isActive: true,
      userId: sub,
      tenantId,
    });
    console.info("[auth:jwt] Active session lookup completed", {
      found: !isNil(activeSession),
    });

    const tenantHeaderMatches =
      tenantid === undefined || tenantid === tenantId;
    console.info("[auth:jwt] Tenant header check completed", {
      provided: typeof tenantid === "string",
      matches: tenantHeaderMatches,
    });

    if (
      !tenantHeaderMatches ||
      (isNil(user) && isNil(trialMember)) ||
      isNil(tenant) ||
      isNil(activeSession)
    ) {
      console.warn("[auth:jwt] Validation failed", {
        tenantHeaderMatches,
        userOrTrialMemberFound: !isNil(user) || !isNil(trialMember),
        tenantFound: !isNil(tenant),
        activeSessionFound: !isNil(activeSession),
      });
      return { isValid: false };
    }
    console.info("[auth:jwt] Validation successful");
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
    console.warn("[auth:jwt] Validation failed: decoded token is empty");
    return { isValid: false };
  }
};

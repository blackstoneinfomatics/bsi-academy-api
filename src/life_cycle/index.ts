import { Server, Request } from "@hapi/hapi";
import { appStatusCodes } from "../config/messages";
import AppLogger from "../helpers/logging";
import { authUserData } from "../shared/common";

const register = (server: Server) => {
  server.events.on("response", (request: Request) => {
    const { response, headers, method, payload, query, info, url } = request;
    const requestUserDetails = authUserData(headers.authorization ?? '');
    if ("statusCode" in response) {
      if (response.statusCode !== appStatusCodes[0]) {
        const responseTimeMs: string = (
          (request.info.responded - request.info.received) /
          1000
        ).toFixed(2);
        AppLogger.error("Request Error", {
          statusCode: response.statusCode,
          method: method.toUpperCase(),
          requestPath: url,
          responseTime: `${responseTimeMs} Seconds`,
          requestUser: requestUserDetails,
          payload: payload || "No Payload",
          query: query || "No Query Params",
          userAgent: headers["user-agent"] || "Unknown",
          referrer: headers.referrer || "No Referrer",
          ipAddress: info.remoteAddress,
          tenantId: headers["tenantid"] || "Unknown Tenant",
          responsePayload: response.source || "No Response Payload",
        });
      }
    }
  });
};

export default {
  name: "system-life-cycle",
  register,
};

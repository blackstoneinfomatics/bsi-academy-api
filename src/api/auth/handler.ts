/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import { getAcademicAvaialableTimeList, teacherAvailableTimeList, updateUserPassword } from "../../operations/auth";
import {
  decryptPassword,
  generateAuthToken,
  hashPassword,
  verifyPassword,
} from "../../shared/common";
import { isNil, omit } from "lodash";
import { badRequest, notFound, unauthorized } from "@hapi/boom";
import {
  authMessages,
  userMessages,
} from "../../config/messages";
import jwt from "jsonwebtoken";
import { zodAuthenticationSchema } from "../../shared/zod_schema_validation";
import { createActiveSessionRecord, getActiveSessionRecord, updateActiveSessionRecord } from "../../operations/active_session";
import { getActiveUserRecord, updateUser } from "../../operations/users";
import { getActiveTenantRecordByCode } from "../../operations/tenants";
import ActiveSessionModel from "../../models/active_session";
import { getActiveStudentRecord } from "../../operations/alstudents";
import UserModel from "../../models/users";
import AlStudentsModel from "../../models/alstudents";

// Input validation for user signin
const signInInputValidation = z.object({
  payload: zodAuthenticationSchema.pick({
    username: true,
    password: true,
  }),
});

// Input Validation for Change password
const changePasswordInputValidation = z.object({
  payload: zodAuthenticationSchema.pick({
    password: true,
  }),
});
const checkEmailInputValidation = z.object({
  payload: z.object({
    email: z.string().email(),
  }),
});
export default {
  async signIn(req: Request, h: ResponseToolkit) {
    const { payload } = signInInputValidation.parse({
      payload: req.payload,
    });

    const { username, password } = payload;
    let user: any = await getActiveUserRecord({ userName: username });    // Validate the user exists in the DB
    if (isNil(user)) {
      return badRequest(userMessages.USER_NOT_FOUND);
    }

    if (!(await verifyPassword(decryptPassword(password), user.password))) {
      return unauthorized(authMessages.INCORRECT_PASSWORD);
    }

       // Determine which record to use
    const activeRecord = user;
  // 🔎 Step 1: Find latest session for this user (by loginDate)
  const latestSession = await ActiveSessionModel.findOne({ userId: String(activeRecord._id) })
    .sort({ loginDate: -1 }) // most recent first
    .exec();

  if (latestSession) {
    console.log("Latest session:", latestSession.loginDate);

    // Step 2: If latest session is still active, block login
    // if (latestSession.isActive) {
    //   return unauthorized("User already logged in on another device/session");
    // }
  }

    const jwtPayload = {
      userName: user.userName,
      sub: String(user._id),
      tenantId: user.tenantId,
    };
    const accessToken = generateAuthToken(jwtPayload);
    const userWithoutPassword = omit(user, ["password"]);

    await updateUser(String(user._id), { lastLoginDate: new Date() });

    // Save the session for logout activity
    await createActiveSessionRecord({
      tenantId: user.tenantId,
      userId: String(user._id),
      loginDate: new Date(),
      isActive: true,
      accessToken,
    });

    const tenantData: any = await getActiveTenantRecordByCode(user.tenantId);

    // Return user details with auth token for successfull login
    return {
      ...userWithoutPassword,
      accessToken,
      organizationName: tenantData.organizationName ?? null,
      tenantJobCode: tenantData.tenantJobCode ?? null
    };
  },

  async studentSignIn(req: Request, h: ResponseToolkit) {
    const { payload } = signInInputValidation.parse({
      payload: req.payload,
    });

    const { username, password } = payload;

    let users: any = await getActiveStudentRecord({ username: username });

    // Validate the user exists in either DB
    if (isNil(users)) {
      return badRequest(userMessages.USER_NOT_FOUND);
    }
    // Check password for `users`
    if (users && payload.password !== users.password) {
      return unauthorized(authMessages.INCORRECT_PASSWORD);
    }

    // Determine which record to use
    const activeRecord = users;
    // 🔎 Step 1: Find latest session for this user (by loginDate)
    const latestSession = await ActiveSessionModel.findOne({ userId: String(activeRecord._id) })
    .sort({ loginDate: -1 }) // most recent first
    .exec();

  if (latestSession) {
    console.log("Latest session:", latestSession.loginDate);

    // Step 2: If latest session is still active, block login
    // if (latestSession.isActive) {
    //   return unauthorized("User already logged in on another device/session");
    // }
  }
    const jwtPayload = {
      userName:  activeRecord.username,
      sub: String(activeRecord._id),
    };

    const accessToken = generateAuthToken(jwtPayload);
    const userWithoutPassword = omit(activeRecord, ["password"]);
  //  await updateUser(String(activeRecord._id), { lastLoginDate: new Date() });

    // Save the session for logout activity
    await createActiveSessionRecord({
      userId: String(activeRecord._id),
      loginDate: new Date(),
      isActive: true,
      accessToken,
      tenantId: activeRecord.tenantId ?? "Unknown",
    });

    return {
      ...userWithoutPassword,
      accessToken,
    };
  },

  async signOut(req: Request, h: ResponseToolkit) {

    const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
    const tenantid = Array.isArray(req.headers.tenantid) ? req.headers.tenantid[0] : req.headers.tenantid;

    // Check if Authorization header is present and starts with 'Bearer '
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return badRequest(authMessages.NO_TOKEN_PROVIDED);
    }

    const token = authorization.replace("Bearer ", "");

    const decodedToken: any = jwt.decode(token);

    if (!decodedToken) {
      return unauthorized(authMessages.INVALID_TOKEN);
    }
    const checkAuthToken: any = await getActiveSessionRecord({
      accessToken: token,
      isActive: true,
      userId: decodedToken.sub,
      tenantId: tenantid ?? "",
    });

    // Check the provided token exists in the database
    if (isNil(checkAuthToken)) {
      return unauthorized(authMessages.TOKEN_NO_LONGER_VALID);
    }

    const result = await updateActiveSessionRecord(String(checkAuthToken._id), { isActive: false });

    if (isNil(result)) {
      return badRequest(authMessages.SIGNOUT_UNSUCCESS);
    }

    return h
      .response({ message: authMessages.SIGNOUT_SUCCESS });
  },

  // User's Change Password
  async changePassword(req: Request, h: ResponseToolkit) {
    const { payload } = changePasswordInputValidation.parse({
      payload: req.payload,
    });

    const { password } = payload;

    const hashedPassword = await hashPassword(decryptPassword(password));

    const result = await updateUserPassword(
      String(req.params.userId),
      hashedPassword
    );

    if (isNil(result)) {
      return notFound(userMessages.USER_NOT_FOUND);
    }

    return result;
  },

    async checkEmail(req: Request, h: ResponseToolkit) {
    const { payload } = checkEmailInputValidation.parse({
      payload: req.payload,
    });
    const { email } = payload;

      const user = await AlStudentsModel.findOne({ 'student.studentEmail': email }).exec();
      let users: any = await getActiveStudentRecord({ username: user?.username });

      if (isNil(user)) {
        return h.response({
          message: 'Email not found.',
        }).code(404); // 404 - Not Found
      }

      const activeRecord = users;

    const jwtPayload = {
      userName: activeRecord.userName ,
      sub: String(activeRecord._id),
    };

    const accessToken = generateAuthToken(jwtPayload);
  //  await updateUser(String(activeRecord._id), { lastLoginDate: new Date() });

    // Save the session for logout activity
    await createActiveSessionRecord({
      userId: String(activeRecord._id),
      loginDate: new Date(),
      isActive: true,
      accessToken,
      tenantId: activeRecord.tenantId ?? "Unknown",
    });
      
     
      return {
        message: 'Email found.',
        id:users._id,
        username1:user.username,
        accessToken,
        role:user.role,
        package:user.student.package
      };// 200 - OK
  },


  async allcheckEmail(req: Request, h: ResponseToolkit) {
    const { payload } = checkEmailInputValidation.parse({
      payload: req.payload,
    });
    const { email } = payload;

      const user = await UserModel.findOne({ 'email': email }).exec();
      let users: any = await getActiveUserRecord({ userName: user?.userName });

      if (isNil(user)) {
        return h.response({
          message: 'Email not found.',
        }).code(404); // 404 - Not Found
      }

      const activeRecord = users;

    const jwtPayload = {
      userName: activeRecord.userName ,
      sub: String(activeRecord._id),
    };

    const accessToken = generateAuthToken(jwtPayload);
  //  await updateUser(String(activeRecord._id), { lastLoginDate: new Date() });

    // Save the session for logout activity
    await createActiveSessionRecord({
      userId: String(activeRecord._id),
      loginDate: new Date(),
      isActive: true,
      accessToken,
      tenantId: activeRecord.tenantId ?? "Unknown",
    });
      
     
      return {
        message: 'Email found.',
        id:users._id,
        username1:activeRecord.userName,
        accessToken,
        role:user.role[0]
      };// 200 - OK
  },


 async getAcademicAvaialableTime(req: Request, h: ResponseToolkit){
  const scheduleDate = Array.isArray(req.query.scheduleDate) ? req.query.scheduleDate[0] : req.query.scheduleDate;
  return getAcademicAvaialableTimeList(scheduleDate ?? "");

 },

   async getTeacherAvaialableTime(req: Request, h: ResponseToolkit){
  const scheduleDate = Array.isArray(req.query.scheduleDate) ? req.query.scheduleDate[0] : req.query.scheduleDate;
  const position = Array.isArray(req.query.position) ? req.query.position[0] : req.query.position;
  return teacherAvailableTimeList(scheduleDate ?? "", position ?? "");

 }
};
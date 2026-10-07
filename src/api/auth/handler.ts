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
import TrialMemberModel from "../../models/trailmember";
import SubscriptionTrial from "../../models/subcriptionTrial";
import Tenants from "../../models/tenants";
import { appStatus } from "../../config/messages";
import { Status, SubscriptionTrialStatus } from "../../shared/enum";

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
  console.info("[auth:signIn] Sign-in request received", { username });

  // 1. Check normal UserModel first
  const mainUser = await getActiveUserRecord({
    userName: username,
  });
  console.info("[auth:signIn] Regular user lookup completed", {
    found: !!mainUser,
  });

  let user: any = mainUser;
  let isTrialMember = false;

  // 2. If normal user doesn't exist, check TrialMemberModel
  if (!mainUser) {
    const now = new Date();

    const trialMember = await TrialMemberModel.findOne({
      userName: username,
      status: appStatus.ACTIVE,
    }).lean();

    const activeTrial = trialMember
      ? await SubscriptionTrial.findOne({
          tenantId: trialMember.tenantId,
          status: SubscriptionTrialStatus.ACTIVE,
          trialEndDate: { $gt: now },
          deletedAt: null,
        }).lean()
      : null;

    user = activeTrial ? trialMember : null;
    isTrialMember = !!activeTrial;
    console.info("[auth:signIn] Trial member lookup completed", {
      memberFound: !!trialMember,
      activeTrialFound: !!activeTrial,
    });
  }

  // 3. No user found
  if (isNil(user)) {
    console.warn("[auth:signIn] Sign-in rejected: account not found or trial unavailable", {
      username,
    });
    return badRequest(userMessages.USER_NOT_FOUND);
  }

  // 4. Verify password
  const decryptedPassword = decryptPassword(password);

  const isPasswordValid = await verifyPassword(
    decryptedPassword,
    user.password
  );

  if (!isPasswordValid) {
    console.warn("[auth:signIn] Sign-in rejected: password mismatch", {
      username,
      accountType: isTrialMember ? "trialMember" : "user",
    });
    return unauthorized(authMessages.INCORRECT_PASSWORD);
  }

  // 5. Generate token
  const jwtPayload = {
    userName: user.userName,
    sub: String(user._id),
    tenantId: user.tenantId,
  };

  const accessToken = generateAuthToken(jwtPayload);

  // 6. Remove password
  const userWithoutPassword = omit(user, ["password"]);

  // 7. Update last login only for normal users
  if (!isTrialMember) {
    await updateUser(String(user._id), {
      lastLoginDate: new Date(),
    });
  }

  // 8. Create session
  await createActiveSessionRecord({
    tenantId: user.tenantId,
    userId: String(user._id),
    loginDate: new Date(),
    isActive: true,
    accessToken,
  });

  // 9. Get tenant
  const tenantData = isTrialMember
    ? await Tenants.findOne({
        tenantCode: user.tenantId,
        status: Status.TRIAL,
      }).lean()
    : await getActiveTenantRecordByCode(user.tenantId);

  if (!tenantData) {
    console.warn("[auth:signIn] Sign-in rejected: tenant unavailable", {
      tenantId: user.tenantId,
      accountType: isTrialMember ? "trialMember" : "user",
    });
    return badRequest(userMessages.USER_NOT_FOUND);
  }

  // 10. Return response
  console.info("[auth:signIn] Sign-in successful", {
    tenantId: user.tenantId,
    accountType: isTrialMember ? "trialMember" : "user",
  });
  return {
    ...userWithoutPassword,

    ...(isTrialMember
      ? {
          role: ["ADMIN"],
          isTrialMember: true,
        }
      : {
          isTrialMember: false,
        }),

    accessToken,
    organizationName: tenantData.organizationName ?? null,
    tenantJobCode: tenantData.tenantJobCode ?? null,
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

    const { authorization, tenantid } = req.headers;

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
      tenantId: tenantid,
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
      return badRequest(userMessages.USER_NOT_FOUND);
    }

      const activeRecord = users;

       const jwtPayload = {
      userName: user.userName,
      sub: String(user._id),
      tenantId: user.tenantId,
    };
    const accessToken = generateAuthToken(jwtPayload);

    await updateUser(String(user._id), { lastLoginDate: new Date() });

    // Save the session for logout activity
    await createActiveSessionRecord({
      tenantId: user.tenantId || "",
      userId: String(user._id),
      loginDate: new Date(),
      isActive: true,
      accessToken,
    });

    const tenantData: any = await getActiveTenantRecordByCode(activeRecord.tenantId);

    // Return user details with auth token for successfull login
    return {
      success:true,
       message: 'Email found.',
        id:users._id,
        username:activeRecord.userName,
         role:user.role[0],
      accessToken,
      organizationName: tenantData.organizationName ?? null,
      tenantJobCode: tenantData.tenantJobCode ?? null
    };
  },


 async getAcademicAvaialableTime(req: Request, h: ResponseToolkit){
  return getAcademicAvaialableTimeList(req.query.scheduleDate);

 },

   async getTeacherAvaialableTime(req: Request, h: ResponseToolkit){
  return teacherAvailableTimeList(req.query.scheduleDate, req.query.position);

 }
};
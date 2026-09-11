import { throwError } from "../helpers/throwError";
import tenantsubscription from "../models/tenantsubscription";
import tenantPortal from "../models/tenantPortal";
import { portalMessages } from "../config/messages";
import { PortalStatus, PortalType, SubscriptionStatus } from "../shared/enum";
import mongoose from "mongoose";

export const syncTenantSubscriptionToTenantPortal = async (
  subscriptionId: string,
) => {
  try {
    const subscription = await tenantsubscription.findOne({
      _id: subscriptionId,
      deletedAt: null,
    });

    if (!subscription) {
      throwError("Subscription not found", 404);
    }
  } catch (errro: any) {}
};
export const createCustomTenantPortalService = async (payload: any) => {
  try {
    if (!payload.tenantId) {
      throwError(portalMessages.TENANT_ID_REQUIRED, 400);
    }

    if (!payload.portalName) {
      throwError(portalMessages.PORTAL_NAME_REQUIRED, 400);
    }

    if (!payload.roleType) {
      throwError(portalMessages.ROLE_TYPE_REQUIRED, 400);
    }

    if (!payload.createdBy) {
      throwError(portalMessages.CREATED_BY_REQUIRED, 400);
    }

    if (payload.portalType && payload.portalType !== PortalType.CUSTOM) {
      throwError(portalMessages.INVALID_PORTAL_TYPE, 400);
    }

    const subscription = await tenantsubscription.findOne({
      tenantId: payload.tenantId,
      status:SubscriptionStatus.ACTIVE,
      deletedAt: null,
    });

    if (!subscription) {
      throwError(portalMessages.SUBSCRIPTION_NOT_FOUND, 404);
      return;
    }


    const existing = await tenantPortal.findOne({
      tenantId: payload.tenantId,
      portalName: payload.portalName,
      deletedAt: null,
    });

    if (existing) {
      throwError(portalMessages.TENANT_PORTAL_ALREADY_EXISTS, 409);
    }

    const count = await tenantPortal.countDocuments({
      tenantId: payload.tenantId,
    });

    const portalCode = `POR-CUST-${String(count + 1).padStart(3, "0")}`;
    const id = new mongoose.Types.ObjectId();
    const newTenantPortal = new tenantPortal({
      tenantId: payload.tenantId,
      subscriptionId: subscription?._id,
      portalId: id.toString(),
      portalCode,
      portalName: payload.portalName,
      portalType: PortalType.CUSTOM,
      roleType: payload.roleType,
      userLimit: payload.userLimit || 0,
      isEnabled: payload.isEnabled ?? true,
      description: payload.description || "",
      status: PortalStatus.ACTIVE,
      createdBy: payload.createdBy,
      updatedBy: null,
    });

    await newTenantPortal.save();

    return newTenantPortal;
  } catch (error: any) {
    throw error;
  }
};

export const updateTenantPortalStatusService = async (
  id: string,
  isEnabled: boolean,
) => {
  try {
    const tenantPortalData = await tenantPortal.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!tenantPortalData) {
      throwError(portalMessages.TENANT_PORTAL_NOT_FOUND, 404);
      return;
    }

    const status = isEnabled
      ? PortalStatus.ACTIVE
      : PortalStatus.INACTIVE;

    tenantPortalData.isEnabled = isEnabled;
    tenantPortalData.status = status;
    tenantPortalData.updatedBy = "SUPERADMIN";
    await tenantPortalData.save();

    return tenantPortalData;
  } catch (error) {
    throw error;
  }
};

export const getTenantPortals = async (query: any, tenantId: string) => {
  try {
    const {
      page,
      limit,
      search,
      status,
      roleType,
      portalType,
      isEnabled,
      sortBy,
      sortOrder,
    } = query;

    const filter: any = {
      tenantId: tenantId.trim(),
      deletedAt: null,
    };

    // 🔍 search
    if (search) {
      filter.$or = [
        { portalName: { $regex: search, $options: "i" } },
        { portalCode: { $regex: search, $options: "i" } },
      ];
    }

    // 🎯 filters
    if (status) filter.status = status;
    if (roleType) filter.roleType = roleType;
    if (portalType) filter.portalType = portalType;
    if (isEnabled !== undefined) filter.isEnabled = isEnabled;

    const sort: any = {
      [sortBy || "createdAt"]: sortOrder === "asc" ? 1 : -1,
    };

    const skip = (page - 1) * limit;

    const [items, totalRecords] = await Promise.all([
      tenantPortal
        .find(filter)
        .select(
          "portalId portalCode portalName portalType roleType status isEnabled userLimit createdAt",
        )
        .sort(sort)
        .skip(skip)
        .limit(limit),

      tenantPortal.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  } catch (error) {
    throw error;
  }
};

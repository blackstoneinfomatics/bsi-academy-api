import { Portal } from "../../types/models.types";
import { portalMessages } from "../config/messages";
import { throwError } from "../helpers/throwError";
import { PortalStatus, PortalType } from "../shared/enum";
import PortalModal from "../models/portal";

export const createPortalService = async (payload: Portal) => {
  try {
    if (!payload.portalName) {
      throwError("Portal name is required", 400);
    }

    if (!payload.roleType) {
      throwError("Role type is required", 400);
    }

    if (payload.portalType && !["DEFAULT"].includes(payload.portalType)) {
      throwError(portalMessages.INVALID_PORTAL_TYPE, 400);
    }

    const existingPortal = await PortalModal.findOne({
      portalName: payload.portalName,
      deletedAt: null,
    });

    if (existingPortal) {
      throwError(portalMessages.PORTAL_ALREADY_EXISTS, 409);
    }

    const count = await PortalModal.countDocuments();
    const portalId = `POR-${String(count + 1).padStart(3, "0")}`;

    const newPortal = new PortalModal({
      portalId,
      portalName: payload.portalName,
      portalType: payload.portalType || PortalType.DEFAULT,
      roleType: payload.roleType,
      description: payload.description || "",
      status: PortalStatus.ACTIVE,
      createdBy: "SUPERADMIM",
      updatedBy: null,
    });

    await newPortal.save();

    return newPortal;
  } catch (error: any) {
    throw error;
  }
};

export const getAllPortalService = async (query: any) => {
  try {
    const { page, limit, search, status, roleType, sortBy, sortOrder } = query;

    const filter: any = {
      deletedAt: null,
    };

    if (search) {
      filter.$or = [
        { portalName: { $regex: search, $options: "i" } },
        { portalId: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (roleType) {
      filter.roleType = roleType;
    }

    const sort: any = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const skip = (page - 1) * limit;

    const [items, totalRecords] = await Promise.all([
      PortalModal.find(filter)
        .select(
          "portalId portalName portalType description roleType status createdAt",
        )
        .sort(sort)
        .skip(skip)
        .limit(limit),

      PortalModal.countDocuments(filter),
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

export const getPortalDashboardCountService = async () => {
  try {
    const result = await PortalModal.aggregate([
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $facet: {
          total: [{ $count: "count" }],

          active: [
            { $match: { status: PortalStatus.ACTIVE } },
            { $count: "count" },
          ],

          inactive: [
            { $match: { status: PortalStatus.INACTIVE } },
            { $count: "count" },
          ],

          archived: [
            { $match: { status: PortalStatus.ARCHIVED } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const data = result[0] || {};

    return {
      total: data.total?.[0]?.count || 0,
      active: data.active?.[0]?.count || 0,
      inactive: data.inactive?.[0]?.count || 0,
      archived: data.archived?.[0]?.count || 0,
    };
  } catch (error) {
    throw error;
  }
};

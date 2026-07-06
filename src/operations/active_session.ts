

import { IActiveSession } from "../../types/models.types";
import ActiveSessionModel from "../models/active_session";

export interface ActiveSessionRecord {
  accessToken: string;
  isActive: boolean;
  userId: string;
  tenantId: string;
  loginDate?: Date;
}

/**
 * Fetches an active session record from the database based on the provided query.
 *
 * @param {ActiveSessionRecord} query - The query object used to match the session record.
 * @returns {Promise<IActiveSession | null>} - Returns a promise that resolves to the matched session record or null if no match is found.
 */
export const getActiveSessionRecord = async (query: ActiveSessionRecord): Promise<IActiveSession | null> => {
  return ActiveSessionModel.findOne(query).lean() as unknown as IActiveSession | null;
};

/**
 * Creates a new active session record in the database.
 *
 * @param {ActiveSessionRecord} payload - The data for the new active session record, which includes accessToken, isActive, userId, tenantId, and optionally loginDate.
 * @returns {Promise<IActiveSession>} - Returns a promise that resolves to the created active session record.
 */
export const createActiveSessionRecord = async (payload: ActiveSessionRecord): Promise<IActiveSession> => {
  const activeSession = new ActiveSessionModel(payload);
  return activeSession.save();
};


/**
 * Updates an existing active session record in the database by session ID.
 *
 * @param {string} sessionId - The ID of the active session record to update.
 * @param {any} payload - An object containing the fields to update in the session record.
 * @returns {Promise<IActiveSession | null>} - Returns a promise that resolves to the updated session record or null if no record is found.
 */
export const updateActiveSessionRecord = async (sessionId: string, payload: any): Promise<IActiveSession | null> => {
  return ActiveSessionModel
    .findByIdAndUpdate(
      sessionId,
      { $set: payload },
      { new: true }
    )
    .exec();
};
export const getLatestSessionRecord = async (
  query: { userId: string }
): Promise<IActiveSession | null> => {
  return ActiveSessionModel
    .findOne({ userId: query.userId })
    .sort({ createdAt: -1 })
    .exec();
};
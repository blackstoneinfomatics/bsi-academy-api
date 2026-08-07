import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";


import {
  createReminder,
  getAllReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  getReminderHistory,
} from "../../operations/remainder";

import {
  reminderValidation,
  reminderUpdateValidation,
} from "../../models/remainder";

const createInputValidation = z.object({
  payload: reminderValidation,
});

const updateInputValidation = z.object({
  params: z.object({
    reminderId: z.string(),
  }),
  payload: reminderUpdateValidation,
});

export default {
  // CREATE REMINDER — saves the configuration only, never sends anything.
  // Dispatch happens later from the reminder cron (src/cron/reminder.cron.ts).
  async createReminder(req: Request, h: ResponseToolkit) {
    const { payload } = createInputValidation.parse({
      payload: req.payload,
    });

    const newReminder = await createReminder(payload);

    return h
      .response({
        success: true,
        data: newReminder,
      })
      .code(201);
  },

  // GET ALL REMINDERS
  async getReminders(req: Request, h: ResponseToolkit) {
    const reminders = await getAllReminders();

    return h
      .response({
        success: true,
        data: reminders,
      })
      .code(200);
  },

  // GET REMINDER BY ID
  async getReminderById(req: Request, h: ResponseToolkit) {
    const { reminderId } = req.params;

    const reminder = await getReminderById(reminderId);

    return h
      .response({
        success: !!reminder,
        data: reminder,
      })
      .code(reminder ? 200 : 404);
  },

  // UPDATE REMINDER
  async updateReminder(req: Request, h: ResponseToolkit) {
    const { params, payload } = updateInputValidation.parse({
      params: req.params,
      payload: req.payload,
    });

    const updatedReminder = await updateReminder(params.reminderId, payload);

    if (!updatedReminder) {
      return h
        .response({
          success: false,
          message: "Reminder not found",
        })
        .code(404);
    }

    return h
      .response({
        success: true,
        data: updatedReminder,
      })
      .code(200);
  },

  // DELETE REMINDER
  async deleteReminder(req: Request, h: ResponseToolkit) {
    const { reminderId } = req.params;

    const result = await deleteReminder(reminderId);

    return h
      .response({
        success: result.deletedCount > 0,
        message:
          result.deletedCount > 0
            ? "Reminder deleted successfully"
            : "Reminder not found",
      })
      .code(200);
  },

  // GET REMINDER DISPATCH HISTORY
  async getReminderHistory(req: Request, h: ResponseToolkit) {
    const { reminderId } = req.params;

    const history = await getReminderHistory(reminderId);

    return h
      .response({
        success: true,
        data: history,
      })
      .code(200);
  },
};

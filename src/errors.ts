import { badRequest, conflict, internal, isBoom } from "@hapi/boom";
import type { Request, ResponseToolkit, Server } from "@hapi/hapi";
import { ZodError } from 'zod'
import { commonMessages } from './config/messages';
import * as Sentry from '@sentry/node';

const register = (server: Server) => {
  server.ext("onPreResponse", (request: Request, reply: ResponseToolkit) => {

    const { response } = request;

    if (!isBoom(response)) {
      return reply.continue;
    }

    if (isBoom(response)) {
      Sentry.captureException(response);
    }

    // Duplicate record check
    if (response.message.includes(commonMessages.DUPLICATE_RECORD_ERROR)) {
      return conflict(commonMessages.DUPLICATE_RECORD_FOUND);
    }

    // Malformed on invalid encrypted data check
    if (response.message.includes(commonMessages.MALFORMED_RECORD_ERROR)) {
      return internal(commonMessages.MALFORMED_RECORD_FOUND);
    }

    if (response instanceof ZodError) {
      console.log("response", response);
      return badRequest(commonMessages.VALIDATION_ERROR);
    }

    return reply
      .response(response.output.payload)
      .code(response.output?.statusCode)
      .message(response.message);
  });
};

export default {
  name: "error-handler",
  register: register,
};

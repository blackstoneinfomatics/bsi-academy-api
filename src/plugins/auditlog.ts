import { Plugin } from '@hapi/hapi';
import { sendLogsToKafka } from '../kafka/producers/adminProducer';
import Boom from '@hapi/boom';

export const loggerPlugin: Plugin<{}> = {
  name: 'appLogger',
  version: '1.0.0',
  register: async (server) => {
    server.ext('onRequest', (request, h) => {
      (request.plugins as any).startTime = Date.now();
      return h.continue;
    });

   server.ext('onPreResponse', async (request, h) => {
  const response = request.response;
  const startTime = (request.plugins as any).startTime ?? Date.now();
  const duration = Date.now() - startTime;

  const isBoomError = Boom.isBoom(response);
  const statusCode = isBoomError
    ? response.output?.statusCode
    : (response as any)?.statusCode ?? 200;

  const logType = getLogTypeByStatus(statusCode);
  const forwardedIp = request.headers['x-forwarded-for'];
  const remoteIp = request.info.remoteAddress;

  const clientIp = forwardedIp
    ? (Array.isArray(forwardedIp) ? forwardedIp[0] : forwardedIp).split(',')[0].trim()
    : remoteIp;

  const truncate = (input: any, max = 1000) => {
  try {
    const str = typeof input === 'string' 
      ? input 
      : input === undefined || input === null 
        ? '' 
        : JSON.stringify(input);

    return str.length > max ? str.substring(0, max) + '... [truncated]' : str;
  } catch {
    return '[Unserializable data]';
  }
};

  // First draft of logPayload
  let logPayload: any = {
    userId: request.auth?.credentials?.id ?? 'anonymous',
    logType,
    route: request.route?.path ?? request.path ?? 'unknown',
    action: detectActionFromMethod(request.method),
    description:
      logType === 'ERROR'
        ? `Request failed: ${request.path}`
        : `Request ${request.method.toUpperCase()} to ${request.path}`,
    errorMessage: isBoomError ? truncate(response.message, 500) : undefined,
    stack: isBoomError ? truncate(response.stack, 1000) : undefined,
    ip: clientIp,
    meta: {
      method: request.method,
      path: request.path,
      payload: truncate(request.payload, 1000),
      query: truncate(request.query, 500),
      response: isBoomError
        ? truncate(response.output?.payload, 1000)
        : truncate((response as any)?.source ?? null, 1000),
      statusCode,
      durationMs: duration,
      headers: truncate(request.headers, 1000),
    },
    createdDate: new Date(),
  };

  // 💥 Check size
  const sizeInBytes = Buffer.byteLength(JSON.stringify(logPayload), 'utf8');

  // 🧹 If too big, strip errorMessage and stack
  if (sizeInBytes > 1024 * 1024) {
    logPayload.errorMessage = undefined;
    logPayload.stack = undefined;
    console.warn("⚠ Log payload exceeded 1MB. Removed errorMessage and stack.");
  }

  try {
    await sendLogsToKafka({ data: logPayload });
  } catch (err: any) {
    console.error('❌ Kafka send failed:', err.message);
  }

  return h.continue;
});

  },
};

function getLogTypeByStatus(code: number): 'SUCCESS' | 'REDIRECT' | 'ERROR' | 'INFO' {
  if (code >= 200 && code < 300) return 'SUCCESS';
  if (code >= 300 && code < 400) return 'REDIRECT';
  if (code >= 400 && code < 600) return 'ERROR';
  return 'INFO';
}

function detectActionFromMethod(method: string) {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'GET':
      return 'READ';
    default:
      return 'UNKNOWN';
  }
}

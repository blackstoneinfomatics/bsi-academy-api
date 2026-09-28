import { Plugin } from '@hapi/hapi';
import { sendLogsToKafka } from '../kafka/producers/adminProducer';
import Boom from '@hapi/boom';
import { Lookup } from '../models/lookup';
import { role } from '../config/messages';

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
    ? forwardedIp.split(',')[0].trim()
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

 const action = detectActionFromMethod(request.method);

const readableDescription = generateReadableDescription(
  action,
  request.path
);
const superAdminLookup = await Lookup.findOne({
  lookupKey: "SUPER_ADMIN",
  keyValue: "super_admin",
  status: "Active",
}).lean();

const credentials = request.auth?.credentials as any;
const tenantHeader = request.headers.tenantid;
const headerTenantId = Array.isArray(tenantHeader)
  ? tenantHeader[0]
  : tenantHeader;
const tenantId = credentials?.role === role.SUPERADMIN
  ? superAdminLookup?.tenantId ?? credentials?.tenantId ?? headerTenantId
  : credentials?.tenantId ?? headerTenantId;
const logPayload: any = {
  userId: request.auth?.credentials?.id ?? 'anonymous',
  tenantId,
  logType,
  route: request.route?.path ?? request.path ?? 'unknown',

  action,

  // Keep your existing description
  description:
    logType === 'ERROR'
      ? `Request failed: ${request.path}`
      : `Request ${request.method.toUpperCase()} to ${request.path}`,

  // New field
  readableDescription,

  errorMessage: isBoomError
    ? truncate(response.message, 500)
    : undefined,

  stack: isBoomError
    ? truncate(response.stack, 1000)
    : undefined,

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

console.log("========== AUDIT LOG ==========");
console.log("Action:", action);
console.log("Path:", request.path);
console.log("Readable:", readableDescription);
console.log("Payload:", logPayload);
console.log("===============================");



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

function generateReadableDescription(
  action: string,
  path: string
): string {
  // Remove query parameters
  const cleanPath = path.split('?')[0];

  // Remove leading/trailing slashes
  const segments = cleanPath
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) {
    return `${action} request`;
  }

  // Remove IDs from the path
  const meaningfulSegments = segments.filter(
    (segment) => !isId(segment)
  );

  // Convert route segments into readable words
  const resource = meaningfulSegments
    .map(toReadableText)
    .join(' ');

  switch (action) {
    case 'READ':
      return `Viewed ${resource}`;

    case 'CREATE':
      return `Created ${resource}`;

    case 'UPDATE':
      return `Updated ${resource}`;

    case 'DELETE':
      return `Deleted ${resource}`;

    default:
      return `${action} ${resource}`;
  }
}

function isId(value: string): boolean {
  // MongoDB ObjectId
  if (/^[a-f\d]{24}$/i.test(value)) {
    return true;
  }

  // UUID
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  ) {
    return true;
  }

  // Numeric ID
  if (/^\d+$/.test(value)) {
    return true;
  }

  // Custom IDs
  if (/^(TEN|PLAN|USR|PAY|INV|POR)-?\d+$/i.test(value)) {
    return true;
  }

  return false;
}


function toReadableText(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
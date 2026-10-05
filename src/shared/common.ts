import bcrypt from 'bcrypt';
import config from '../config/env';
import CryptoJS from 'crypto-js';
import jwt from 'jsonwebtoken';
import { isNil } from 'lodash';
import { randomInt } from 'crypto';

interface RedisData {
  jobProfilingId: string;
  jobDescription: string;
  jobAdditionalDetails: any;
  link: any;
  model: any;
  tenantId: string;
}

const ROLE_SHORT: Record<string, string> = {
  ADMIN: "ADM",
  SUPERADMIN: "SAD",
  USER: "USR",
  MANAGER: "MGR",
};

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const NUM = '0123456789';
const SPECIAL = '!@#$%^&*';
const ALL = UPPER + LOWER + NUM + SPECIAL;

const secretKey = "my-secret-key";

// Hash password function
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

// Verify Hashed password
export const verifyPassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// Function to decode the custom encoded string back to Base64
export const decodeCustomBase64 = (value: string): string => {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
};


// Custom validation function to check if the password is encrypted
export const isEncryptedPassword = (value: string): boolean => {

    const base64 = decodeCustomBase64(value);
    // CryptoJS.AES.decrypt already handles the OpenSSL "Salted__" Base64 format
    const decryptedBytes = CryptoJS.AES.decrypt(base64, secretKey);

    // Step 3: Convert decrypted WordArray to UTF-8 string
    const decryptedPassword = decryptedBytes.toString(CryptoJS.enc.Utf8);

    return decryptedPassword !== '';
   
};

export const decryptPassword = (
  encryptedValue: string
): string => {
    // Direct decrypt
    const decryptedBytes =
      CryptoJS.AES.decrypt(
        encryptedValue,
        secretKey
      );


    // Convert decrypted bytes to UTF8
    const decryptedText =
      decryptedBytes.toString(
        CryptoJS.enc.Utf8
      );
    return decryptedText;
};
// Generate JWT token
export const generateAuthToken = (data: any): string => jwt.sign(data, config.jwtAuth.secret, { expiresIn: config.jwtAuth.expiresIn, algorithm: 'HS256' });

export const authUserData = (token: string) => {
  let userInfo = {
    userName: "NO-AUTH",
    userId: "Unknown",
    tenantId: "Unknown"
  };
  const decodedToken: any = jwt.decode(token.replace("Bearer", ""));
  if (decodedToken) {
    const { userName, sub, tenantId } = decodedToken;
    userInfo = {
      userName: userName ?? "NO-AUTH",
      userId: sub ?? "Unknown",
      tenantId: tenantId ?? "Unknown"
    };
  }
  return userInfo;
}

// Helper function to format values
export const formatAuditChangedValues = (value: any): string => {
  // Helper function to format objects
  const formatObject = (obj: object): string => {
    return JSON.stringify(
      obj,
      (key, value) => ((key === "_id" || key === "type") ? undefined : value),
      2
    );
  };

  if (isNil(value)) {
    return "Null";
  }
  if (typeof value === "object") {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return formatObject(value); // Format objects, excluding _id
  }
  return String(value); // Convert all other values to string
};
export const convertHtmlTemplateToString = (value: string): string => value.replace(/<\/?([ou]l|li|b)[^>]*>/gi, '').replace(/<[^>]*>/g, '').replace(/•/g, '').replace(/\s+/g, ' ').trim();


export const generateRandom8Digit = (): number => Math.floor(10000000 + Math.random() * 90000000);


export const generateRandomPassword = ( length : number = 12 ) : string =>{
    if( length < 8 ) {
        throw new Error("Password length should be at least 8 characters.");
    }

    let password = '';

    password += UPPER[randomInt(UPPER.length)];
    password += LOWER[randomInt(LOWER.length)];
    password += NUM[randomInt(NUM.length)];
    password += SPECIAL[randomInt(SPECIAL.length)];

    for(let i = password.length; i < length; i++){
        password += ALL[randomInt(ALL.length)];
    }

    return shuffle(password);
}

function shuffle(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

export function generateUserId(role: string[]): string {
  const primaryRole = role?.[0] || "USER";

  const roleShort = ROLE_SHORT[primaryRole] || "USR";

  const number = randomInt(10000, 99999); // ✅ 5-digit number

  return `BSI${roleShort}-${number}`;
}
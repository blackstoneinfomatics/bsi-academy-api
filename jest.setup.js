// jest.setup.js
import dotenv from 'dotenv';

export const loadEnv = (file) => {
  // We want to reset all modules before loading the env file
  // to ensure subsequent imports use the updated env
  jest.resetModules();

  if (!file) {
    throw new Error('no env file provided');
  }

  const res = dotenv.config({
    path: `${__dirname}/${file}`,
    override: true,
  });

  if (res.error) {
    throw res.error;
  }

  if (Object.keys(res.parsed).length === 0) {
    throw new Error(`no env vars were parsed using file '${file}'`);
  }
};

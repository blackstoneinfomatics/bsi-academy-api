import { Server } from '@hapi/hapi';
import HapiAuthJWT2 from 'hapi-auth-jwt2';
import config from '../config/env';
import { validateUserAuth } from '../helpers/jwt';
import Inert from '@hapi/inert';
import Vision from '@hapi/vision';
import HapiSwagger from 'hapi-swagger';

const register = async (server: Server) => {
  await server.register(HapiAuthJWT2);
   await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: config.swaggerOptions,
    },
  ]);
  server.auth.strategy('jwt', 'jwt', {
    key: config.jwtAuth.secret,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: 43200 // Token expiration time (12 hours)
    },
    validate: validateUserAuth,
    verifyOptions: {
      algorithms: ['HS256'],
    },
  });
};

export default {
  name: 'jwt-component',
  register: register,
};
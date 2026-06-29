import { Server, ServerRoute } from "@hapi/hapi";
import handler from './handler';
import { tenantsMessages } from '../../config/messages'

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [

    {
      method: 'POST',
      path: '/tenant',
      options: {
        handler: handler.createTenant,
        description: tenantsMessages.CREATE,
        tags: ['api', 'tenants'],
        // auth: {
        //   strategies: ['jwt']
        // },
      },
    },

    {
      method: 'GET',
      path: '/tenant-settings',
      options: {
        handler: handler.getAllTenantsSettings,
        description: tenantsMessages.LIST,
        tags: ['api', 'tenants'],
        auth: {
          strategies: ['jwt']
        },
      },
    },
    {
      method: 'POST',
      path: '/tenant-settings',
      options: {
        handler: handler.createTenantSettings,
        description: tenantsMessages.CREATE,
        tags: ['api', 'tenants'],
        auth: {
          strategies: ['jwt']
        },
      },
    },
    {
      method: 'PUT',
      path: '/tenant-settings/{tenantSettingsId}',
      options: {
        handler: handler.updateTenantSettings,
        description: tenantsMessages.UPDATE,
        tags: ['api', 'tenants'],
        auth: {
          strategies: ['jwt']
        },
      },
    },
    {
      method: 'GET',
      path: '/tenant/{tenantCode}',
      options: {
        handler: handler.getTenantDetailsByCode,
        description: tenantsMessages.BYID,
        tags: ['api', 'tenants'],
        auth: {
          strategies: ['jwt']
        },
      },
    },
    // {
    //   method: 'PUT',
    //   path: '/tenant/{tenantId}',
    //   options: {
    //     handler: handler.updateTenantDetailsById,
    //     description: tenantsMessages.BYID,
    //     tags: ['api', 'tenants'],
    //     auth: {
    //       strategies: ['jwt']
    //     },
    //   },
    // },
  ];
  server.route(routes);
};
export = {
  name: 'api-tenants',
  register,
};
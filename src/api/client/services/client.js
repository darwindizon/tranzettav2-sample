'use strict';

/**
 * client service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService(
    'api::client.client',
    ({ strapi }) => ({
      async findOneByField(entity, params = {}) {
        
        const client = await strapi.db
          .query('api::client.client')
          .findOne({
            where: entity,
            populate: ["apps", "apps.token" ],
          });
  
        return client;
      },
    })
  );

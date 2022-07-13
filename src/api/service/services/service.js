'use strict';

/**
 * service service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService(
    'api::service.service',
    ({ strapi }) => ({
      async findOneByField(entity, params = {}) {
        
        const client = await strapi.db
          .query('api::service.service')
          .findOne({
            where: entity,
            populate: {
              client: true,
            },
          });
  
        return client;
      },
    })
  );

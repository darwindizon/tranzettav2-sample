'use strict';

/**
 *  global-service controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::global-service.global-service');

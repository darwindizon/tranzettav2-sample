'use strict';

/**
 * A set of functions called "actions" for `tranzetta`
 */
module.exports = {
  connection: async (ctx, next) => {
    const { client, service, apps } = ctx.state;

    //strapi.log.info(JSON.stringify(client));
    //strapi.log.info(JSON.stringify(service));

    //strapi.log.info(apps);
    //strapi.log.info(service.event);

    const result = await eval(" async (apps) => {" + service.event + "}; ")(apps);

    //strapi.log.error(JSON.stringify(ctx.res));

    //const data = await actions[service](client);
    await next();

    return result;
  },
};

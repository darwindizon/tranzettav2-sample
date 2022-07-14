module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    const { authorization } = ctx.header;

    // verify client token and service
    const key = authorization.split(' ');
    const clientData = await strapi.service('api::client.client').findOneByField({ token: key[1], active: true });

    if(clientData) {
      ctx.state.apps = {};
      
      if(clientData.apps.length > 0) {
        for(let x = 0; x < clientData.apps.length; x++) {
          const data = clientData.apps[x];

          if (data) {
            if (data.__component === 'accounts.acumatica') {
              ctx.state.apps.ac = await strapi.service('api::tranzetta.acumatica-wrapper')({ ...data, accountId: clientData.id });
            } else if (data.__component === 'accounts.bigcommerce') {
              ctx.state.apps.bc = await strapi.service('api::tranzetta.bigcommerce-wrapper')(data);
            } else if (data.__component === 'accounts.shopify') {
              ctx.state.apps.sp = null;
            } else if (data.__component === 'accounts.redis') {
              ctx.state.apps.rd = null;
            }
          }
        }
      }

      ctx.state.client = clientData ?? null;
    } else {
      return ctx.unauthorized('Unauthorized Request');
    }

    await next(); 
  };

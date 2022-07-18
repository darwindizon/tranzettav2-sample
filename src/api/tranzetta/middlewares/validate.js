module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    const { authorization } = ctx.header;
    const { service } = ctx.params;
    const { scope } = ctx.query;

    // verify client token and service
    const key = authorization.split(' ');
    const clientData = await strapi.service('api::client.client').findOneByField({ token: key[1], active: true });

    if(clientData) {
      ctx.state.client = clientData ?? null;
      if (!ctx.state.apps) {
        ctx.state.apps = {};
      }
      await strapi.service('api::tranzetta.evaluate-event')(ctx.state).getActions(service, scope);
    } else {
      return ctx.unauthorized('Unauthorized Request');
    }

    await next(); 
  };

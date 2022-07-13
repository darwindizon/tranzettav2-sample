
module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    const { service } = ctx.params;
    const serviceData = await strapi.service('api::service.service').findOneByField({ client: 1});
    
    //strapi.log.info (JSON.stringify(serviceData));
    // if (serviceData) {
    //   //const action = module.actions.find(i => i.name === service);
    //   strapi.log.info ('pass');
    //   ctx.state.actions = {
    //     [service] : eval("async (client) => {" + serviceData.event + "}")
    //   }

    //   // if (ctx.request.method === action.type) {
       
    //   // } else {
    //   //   // invalid request
    //   // }
    // } else {
    //   //missing module
    // }
    await next();
  };

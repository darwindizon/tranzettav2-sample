module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {

    const { service } = ctx.params;
    const { authorization } = ctx.header;
    let apps = {}

    //strapi.log.info(authorization);

    // verify client token and service
    const key = authorization.split(' ');
    const clientData = await strapi.service('api::client.client').findOneByField({ token: key[1], active: true });
    const serviceData = await strapi.service('api::service.service').findOneByField({ name: service, client: { id: clientData.id } });

    //strapi.log.info(JSON.stringify(clientData.apps));
    //strapi.log.info(JSON.stringify(serviceData));

    if(clientData && serviceData) {
      ctx.state.apps = {};
      
      if(clientData.apps.length > 0) {

        const acData = clientData.apps.filter(i => i.__component === 'accounts.acumatica')[0];
        const bcData = clientData.apps.filter(i => i.__component === 'accounts.bigcommerce')[0];

        ctx.state.apps = {
          ac: !acData ? null : await strapi.service('api::tranzetta.acumatica-wrapper')(acData, clientData),
          bc: !bcData ? null : await strapi.service('api::tranzetta.bigcommerce-wrapper')(bcData)

        };

        // clientData.apps.forEach(async i => { 
        //   try {

        //     switch(i.__component) {
        //       case 'accounts.acumatica':
        //         strapi.log.info('get ac app');

        //         ctx.state.apps.ac = await strapi.service('api::tranzetta.acumatica-wrapper')(i, clientData);
  
        //         //strapi.log.info(JSON.stringify(i));
        //         break;
        //       case 'accounts.bigcommerce':
        //         strapi.log.info('get bc app');

        //         ctx.state.apps.bc = await strapi.service('api::tranzetta.bigcommerce-wrapper')(i);
  
        //         //strapi.log.info(JSON.stringify(i));
        //         break;
        //       case 'accounts.shopify':
        //         // ctx.state.apps = {
        //         //   sc: await strapi.service('api::tranzetta.acumatica-wrapper')(i)
        //         // }
        //         break;
        //     }

        //   }
        //   catch(err) {
        //     strapi.log.error(err);
        //   }
          
        //   //strapi.log.info(JSON.stringify(apps));
        // });
      }

      ctx.state.client = clientData ?? null;
      ctx.state.service = serviceData ?? null;
      //ctx.state.apps = apps ?? null;

      //strapi.log.info(JSON.stringify(ctx.state.apps));
    }
    else {
      //throw 403
      ctx.status = 403;
    }

    await next(); 
  };

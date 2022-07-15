'use strict';

const CronJobManager = require('cron-job-manager');
const translate = require("friendly-node-cron");

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {
    (async () => {

      const { results } = await strapi.service('api::job.job').find({
        populate: {
          services: {
            populate: {
              client: {
                populate: {
                  apps: true
                }
              }
            }
          }
        }
      });

      const globalModules = await strapi.entityService.findMany('api::global-service.global-service', { 
        populate: { 
          actions : true
        }
      });

      global.manager = new CronJobManager();
      const state = {};

      const _getActionsEvent = async (service, src, clientStage) => {
        if (!service) {
          return
        }

        const generalParams = '({ apps, actions })';
        const _regexServices = new RegExp("{{local.*}}|{{global.*}}", "gim");

        let match = [];
        let m;
        do {
          m = _regexServices.exec(service.event);
            if (m) {
              match.push(m[0])
            }
        } while (m);

        if (match) {
          for(let x = 0; x < match.length; x++) {
            if (match[x] !== null && match[x].trim() !== 'local' && match[x].trim() !== 'global') {
              const _src = match[x].indexOf('local.') > -1 ? 'local' : 'global';
              const _serviceName = match[x].replace(/{{(local|global)./i, '').replace('}}', '');
              
              service.event = service.event.replace(match[x], `await actions.${_src}.${_serviceName}${generalParams}`);
              
              if (_serviceName) {
                let _service;

                if (_src === 'global') {
                  _service = globalModules.actions.find(i => i.name === _serviceName);
                } else {
                  _service = await strapi
                    .service('api::service.service')
                    .findOneByField({ 
                      name: _serviceName, 
                      client: { id: service.client.id } 
                    });
                }

                if (_service) {
                  await _getActionsEvent(
                    _service, 
                    match[x].indexOf('local.') > -1 ? 'local' : 'global',
                    clientStage
                  );
                }
              }
            }
          }
        }

        if (service && !clientStage.actions[src][service.name]) {
          clientStage.actions[src][service.name] = eval(`async ${generalParams} => { ${service.event} }`);
        }
      };

      for (let y = 0; y < results.length; y++) {
        const job = results[y];

        if (!job.active) {
          break;
        }

        global.manager.add(
          `${job.id}-${job.name}`, // name
          translate(job.schedule), // schedule
          async () => { 
            // event
            
            for(let z = 0; z < job?.services?.length; z++) {
              const service = job.services[z];
              // event(state)
              
              if (service) {
                if (!state[service.client.id]) {
                  state[service.client.id] = {
                    apps: {},
                    actions: {
                      local: {},
                      global: {}
                    }
                  };
                }
                
                for(let x = 0; x < service?.client?.apps.length; x++) {
                  const data = service.client.apps[x];
        
                  if (data) {
                    if (data.__component === 'accounts.acumatica' && !state[service.client.id].apps.ac) {
                      state[service?.client.id].apps.ac = await strapi.service('api::tranzetta.acumatica-wrapper')({ ...data, accountId: service.client.id });
                    } else if (data.__component === 'accounts.bigcommerce' && !state[service.client.id].apps.bc) {
                      state[service?.client.id].apps.bc = await strapi.service('api::tranzetta.bigcommerce-wrapper')(data);
                    } else if (data.__component === 'accounts.shopify' && !state[service.client.id].apps.sp) {
                      state[service?.client.id].apps.sp = null;
                    } else if (data.__component === 'accounts.redis' && !state[service.client.id].apps.rd) {
                      state[service?.client.id].apps.rd = null;
                    }
                  }
                }
              }

              await _getActionsEvent(service, 'local', state[service.client.id]);
              // const event = eval(`async ({ apps, actions }) => { ${ service.event } }`);

              const jobsDone = await state[service.client.id].actions.local[service.name](state[service.client.id]);
            }

          }, 
          { // options
            start: true,
            onComplete: () => {
              //do something
              console.log('runs when the job is stopped');
            },
          }
        );
      }

    })();
  },
};

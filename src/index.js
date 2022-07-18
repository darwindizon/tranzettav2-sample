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
          actions : {
            populate : {
              jobs: {
                populate: {
                  job: true,
                  clients: {
                    populate: {
                      apps: true
                    }
                  }
                }
              }
            }
          }
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

      const _setAppsDataClass = async (app, clientStage, accountId) => {
        if (!app) {
          return;
        }

        if (app.__component === 'accounts.acumatica' && !clientStage.apps.ac) {
          clientStage.apps.ac = await strapi.service('api::tranzetta.acumatica-wrapper')({ ...app, accountId });
        } else if (app.__component === 'accounts.bigcommerce' && !clientStage.apps.bc) {
          clientStage.apps.bc = await strapi.service('api::tranzetta.bigcommerce-wrapper')(app);
        } else if (app.__component === 'accounts.shopify' && !clientStage.apps.sp) {
          clientStage.apps.sp = null;
        } else if (app.__component === 'accounts.redis' && !clientStage.apps.rd) {
          clientStage.apps.rd = null;
        }
      };

      for(let x = 0; x < globalModules.actions.length; x++) {
        const action = globalModules.actions[x];

        for (let y = 0; y < action.jobs.length; y++) {
          const job = action.jobs[y].job;
          if (!job) {
            continue;
          }

          for (let z = 0; z < action.jobs[y].clients.length; z++) {
            const client = action.jobs[y].clients[z];

            if (!state[client.id]) {
              state[client.id] = {
                apps: {},
                actions: {
                  local: {},
                  global: {}
                }
              };
            }

            for(let v = 0; v < client?.apps.length; v++) {
              const app = client.apps[x];

              await _setAppsDataClass(app, state[client.id], client.id);
            }

            await _getActionsEvent({
              name: action.name,
              event: action.event,
              client: client
            }, 'global', state[client.id]);
            
          }
          
          if (job.schedule) {
            global.manager.add(
              `global::${action.id}-${action.name}-${action.jobs[y].id}-${action.jobs[y].name}`, 
              translate(job.schedule),
              async () => {
                for (let z = 0; z < action.jobs[y].clients.length; z++) {
                  const client = action.jobs[y].clients[z];
                  const jobsDone = await state[client.id].actions.global[action.name](state[client.id]);
                  
                  console.log(`#################### \nScope: Global \nAction: ${action.name} \nJob Run: ${job.name} \nClient: ${client.name} \nOutput: ${jobsDone}`);                
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
        }
      }

      for (let y = 0; y < results.length; y++) {
        const job = results[y];

        if (!job.active || !job.schedule) {
          continue;
        }

        global.manager.add(
          `local::${job.id}-${job.name}`, // name
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
                  const app = service.client.apps[x];

                  await _setAppsDataClass(app, state[service.client.id], service.client.id);
                }
              }

              await _getActionsEvent(service, 'local', state[service.client.id]);
              // const event = eval(`async ({ apps, actions }) => { ${ service.event } }`);

              const jobsDone = await state[service.client.id].actions.local[service.name](state[service.client.id]);
              console.log(`#################### \nScope: Local \nJOB: ${job.name} \nService Run: ${service.name} \nClient: ${service.client.name} \nOutput: ${jobsDone}`);
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

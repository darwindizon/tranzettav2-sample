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
    global.manager = new CronJobManager();

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

      const state = {};

      for(let x = 0; x < globalModules.actions.length; x++) {
        const action = globalModules.actions[x];

        if (!action.active) {
          continue;
        }

        for (let y = 0; y < action.jobs.length; y++) {
          const job = action.jobs[y].job;
          
          if (!job || !job.schedule) {
            continue;
          }
          
          global.manager.add(
            `global::${action.id}-${action.name}-${action.jobs[y].id}-${action.jobs[y].name}`, 
            translate(job.schedule),
            async () => {
              for (let z = 0; z < action.jobs[y].clients.length; z++) {
                const client = action.jobs[y].clients[z];
                
                if(!state[client.id]) {
                  state[client.id] = {};
                }
    
                state[client.id].client = client;
    
                await strapi.service('api::tranzetta.evaluate-event')(state[client.id]).getActions(action.name, 'global');

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
              
              if(!state[service.client.id]) {
                state[service.client.id] = {};
              }

              state[service.client.id].client = service.client;

              await strapi.service('api::tranzetta.evaluate-event')(state[service.client.id]).getActions(service.name, 'local');

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

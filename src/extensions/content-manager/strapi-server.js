
const translate = require("friendly-node-cron");

module.exports = (plugin) => {
   let createOriginal = plugin.controllers['collection-types'].create;
   let deleteOriginal = plugin.controllers['collection-types'].delete;
   let updateOriginal = plugin.controllers['collection-types'].update;

   const setEventsAction = async (job, state) => {
      for(let z = 0; z < job?.services?.length; z++) {
         const service = job.services[z];

         if(!state[service.client.id]) {
            state[service.client.id] = {};
         }

         state[service.client.id].client = service.client;

         await strapi.service('api::tranzetta.evaluate-event')(state[service.client.id]).getActions(service.name, 'local');
         
         const jobsDone = await state[service.client.id]?.actions.local[service.name](state[service.client.id]);
         console.log(`#################### \nScope: Local \nJOB: ${job.name} \nService Run: ${service.name} \nClient: ${service.client.name} \nOutput: ${jobsDone}`);
      }
   };

    plugin.controllers['collection-types'].update = async (ctx) => {
         await updateOriginal(ctx);

         const { model } = ctx.params;
         
         if (model === 'api::job.job') {
            const state = {};
            const _job = ctx.response.body;

            const job = await strapi.service('api::job.job').findOne(_job.id, {
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
             }
            );

            if (job.active) {
               global.manager.update(
                  `local::${job.id}-${job.name}`,
                  translate(job.schedule),
                  async () => await setEventsAction(job, state), 
               );
            } else {
               global.manager.stop(`local::${job.id}-${job.name}`);
            }
         } else if (model === 'api::service.service') {

         }
     };

     plugin.controllers['collection-types'].delete = async (ctx) => {
        await deleteOriginal(ctx);

        if (ctx.params.model === 'api::job.job') {
            const job = ctx.response.body;
            global.manager.deleteJob(`local::${job.id}-${job.name}`);
        } else if (model === 'api::service.service') {
            
         }
     };

     plugin.controllers['collection-types'].create = async (ctx) => {
         await createOriginal(ctx);

         if (ctx.params.model === 'api::job.job') {
            const state = {};
            const _job = ctx.response.body;

            const job = await strapi.service('api::job.job').findOne(_job.id, {
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

            if (!job.active || !job.schedule) {
               return;
            }
      
            global.manager.add(
               `local::${job.id}-${job.name}`, // name
               translate(job.schedule), // schedule
               async () => await setEventsAction(job, state), 
               { // options
                  start: true,
                  onComplete: () => {
                  //do something
                  console.log('runs when the job is stopped');
                  },
               }
            );
         } else if (model === 'api::service.service') {
            
         }
     };
  
    return plugin;
};
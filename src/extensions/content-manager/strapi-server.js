
const translate = require("friendly-node-cron");

module.exports = (plugin) => {
   const createOriginal = plugin.controllers['collection-types'].create;
   const deleteOriginal = plugin.controllers['collection-types'].delete;
   const updateOriginal = plugin.controllers['collection-types'].update;

   const updateSingleTypesOriginal = plugin.controllers['single-types'].createOrUpdate;
   const deleteSingleTypesOriginal = plugin.controllers['single-types'].delete;   

   const setEventsAction = async (job, state) => {
      for(let z = 0; z < job?.services?.length; z++) {
         const service = job.services[z];

         if(!state[service.client.id]) {
            state[service.client.id] = {};
         }

         state[service.client.id].client = service.client;

         try {
            await strapi.service('api::tranzetta.evaluate-event')(state[service.client.id]).getActions(service.name, 'local');
            
            const jobsDone = await state[service.client.id]?.actions.local[service.name](state[service.client.id]);
            console.log(`#################### \nScope: Local \nJOB: ${job.name} \nService Run: ${service.name} \nClient: ${service.client.name} \nOutput: ${jobsDone}`);            
         } catch (error) {
            console.log(error);
         }
      }
   };
   
   const _findJob = async (id) => {
      const job = await strapi.service('api::job.job').findOne(id, {
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

      return job;
   }
   
   const _findGlobalModules = async () => {
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
       }
      );

      return globalModules;
   }
   
   plugin.controllers['single-types'].createOrUpdate = async (ctx) => {
      const { model } = ctx.params;

      // before update handle if actions are deleted
      if (model === 'api::global-service.global-service') {
         const globalModules = await _findGlobalModules();
         
         globalModules.actions.forEach(action => {
            action.jobs.forEach(job => {
               const key = `global::${action.id}-${job.id}`;

               if ((!ctx.request.body?.actions?.some(i => action.id === i.id) || 
                  !ctx.request.body?.actions?.jobs?.some(i => i.id === job.id)) &&
                  global.manager.exists(key)) {
                  global.manager.deleteJob(key); 
               }
            });
         });
      }

      await updateSingleTypesOriginal(ctx);

      // create service
      if (model === 'api::global-service.global-service') {
         const state = {};
         const globalModules = await _findGlobalModules();

         for(let x = 0; x < globalModules.actions.length; x++) {
            const action = globalModules.actions[x];
            for (let y = 0; y < action.jobs.length; y++) {
               const job = action.jobs[y].job;
               
               const key = `global::${action.id}-${action.jobs[y].id}`;
               
               if (!action.active || !job || !job.schedule) {
                  if (global.manager.exists(key)) {
                     global.manager.deleteJob(key);
                  }
               } else {
                  global.manager[global.manager.exists(key) ? 'update' : 'add'](
                     key,
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
                           
                           console.log(`#################### \nScope: Global \nAction: ${action.name} \nJob Run: ${job.id} \nClient: ${client.name} \nOutput: ${jobsDone}`);                
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
      }
   }

   plugin.controllers['single-types'].delete = async (ctx) => {
      await deleteSingleTypesOriginal(ctx);

      const { model } = ctx.params;

      if (model === 'api::global-service.global-service') {
         const globalModules = await _findGlobalModules();
         
         for(let x = 0; x < globalModules.actions.length; x++) {
            const action = globalModules.actions[x];
    
            for (let y = 0; y < action.jobs.length; y++) {
               const key = `global::${action.id}-${action.jobs[y].id}`;
               
               global.manager.deleteJob(key);
            }
         }
      }
   }
   
   plugin.controllers['collection-types'].update = async (ctx) => {
      const { model } = ctx.params;

      await updateOriginal(ctx);
      
      if (model === 'api::job.job') {
         const state = {};
         const _job = ctx.response.body;

         const job = await _findJob(_job.id);

         const key = `local::${job.id}`;

         if (job.active && job.schedule && job.services.length > 0) {
            global.manager[global.manager.exists(key) ? 'update' : 'add'](
               key,
               translate(job.schedule),
               async () => await setEventsAction(job, state), 
               { // options
                  start: true,
                  onComplete: () => {
                     //do something
                     console.log('runs when the job is stopped');
                  },
               }
            );
         } else {
            global.manager.deleteJob(key);
         }
      }
   };

   plugin.controllers['collection-types'].delete = async (ctx) => {
      await deleteOriginal(ctx);

      if (ctx.params.model === 'api::job.job') {
         const job = ctx.response.body;
         const key = `local::${job.id}`;
         
         if (global.manager.exists(key)) {
            global.manager.deleteJob(key);
         }
      }
   };

   plugin.controllers['collection-types'].create = async (ctx) => {
      await createOriginal(ctx);

      if (ctx.params.model === 'api::job.job') {
         const state = {};
         const _job = ctx.response.body;

         const job = await _findJob(_job.id);

         if (!job.active || !job.schedule) {
            return;
         }
   
         global.manager.add(
            `local::${job.id}`, // name
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
      }
   };

   return plugin;
};
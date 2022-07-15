// module.exports = (ctx, strapi, ) => {
//     const generalParams = '({ apps, actions })';

//     //check for nested
//     const _regexServices = new RegExp("{{(local|global).*}}", "gmi");
//     let action;

//     if (src === 'global') {
//         if (globalActions.length === 0) {
//             const modules = await strapi.entityService.findMany('api::global-service.global-service', { 
//                 populate: { 
//                     actions : true
//                 }
//             });

//             globalActions.push(...modules.actions)
//         }

//         action = globalActions.find(i => i.name === _service);
//     } else {
//         action = await strapi.service('api::service.service').findOneByField({ name: _service, client: { id: client.id } });
//     }

//     if (action) {
//         let match = _regexServices.exec(action.event);

//         if (match) {
//             for(let x = 0; x < match.length; x++) {
//                 if (match[x] !== null) {
//                     action.event = action.event.replace(/{{(local|global)./i, 'await actions.local.').replace('}}', generalParams);
                    
//                     await _getActionsEvent(
//                         match[x].replace(/{{(local|global)./i, '').replace('}}', ''), 
//                         match[x].indexOf('local.') > -1 ? 'local' : 'global'
//                     );
//                 }
//             }
//         }

//         // add all actions for nested
//         ctx.state.actions[src][_service] = eval(`async ${generalParams} => { ${action.event} }`);
//     }
// }
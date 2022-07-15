
module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    const { service } = ctx.params;
    const { client } = ctx.state;
    const { scope } = ctx.query;

    ctx.state.actions = {
      local: {},
      global: {}
    };

    // store to reuse if needed for nested
    const globalActions = [];

    const _getActionsEvent = async (_service, src = 'local') => {
      const generalParams = '({ apps, actions })';
      //check for nested
      const _regexServices = new RegExp("{{local.*}}|{{global.*}}", "gim");
      let action;

      if (src === 'global') {
        if (globalActions.length === 0) {
          const modules = await strapi.entityService.findMany('api::global-service.global-service', { 
            populate: { 
              actions : true
            }
          });

          globalActions.push(...modules.actions)
        }

        action = await globalActions.find(i => i.name === _service);
      } else {
        action = await strapi.service('api::service.service').findOneByField({ name: _service, client: { id: client.id } });
      }
      // console.log(action, 'hey')

      if (action) {
        let match = [];
        let m;
        do {
          m = _regexServices.exec(action.event);
            if (m) {
              match.push(m[0])
            }
        } while (m);

        if (match.length) {
          for(let x = 0; x < match.length; x++) {
            if (match[x] !== null) {
              const _src = match[x].indexOf('local.') > -1 ? 'local' : 'global';
              const _serviceName = match[x].replace(/{{(local|global)./i, '').replace('}}', '');

              action.event = action.event.replace(match[x], `await actions.${_src}.${_serviceName}${generalParams}`);
              
              await _getActionsEvent(
                _serviceName, 
                _src
              );
            }
          }
        }

        // add all actions for nested
        ctx.state.actions[src][_service] = eval(`async ${generalParams} => { ${action.event} }`);
      }
    };
    
    // load the main service called
    await _getActionsEvent(service, scope);

    await next();
  };

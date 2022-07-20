const translate = require('friendly-node-cron');

class ServiceEventHandler {
  constructor(state) {
    this.state = state;
    
    this.globalService = [];
  }

  async getClientsApps() {
    if (!this.state.apps) {
      this.state.apps = {};
    }

    if(this.state.client.apps.length > 0) {
      for(let x = 0; x < this.state.client.apps.length; x++) {
        const data = this.state.client.apps[x];

        if (data) {
          if (data.__component === 'accounts.acumatica') {
            this.state.apps.ac = await strapi.service('api::tranzetta.acumatica-wrapper')({ ...data, accountId: this.state.client.id });
          } else if (data.__component === 'accounts.bigcommerce') {
            this.state.apps.bc = await strapi.service('api::tranzetta.bigcommerce-wrapper')(data);
          } else if (data.__component === 'accounts.shopify') {
            this.state.apps.sp = null;
          } else if (data.__component === 'accounts.redis') {
            this.state.apps.rd = null;
          }
        }
      }
    }
  }

  async getGlobalService() {
    await this.getClientsApps();

    try {
      const modules = await strapi.entityService.findMany('api::global-service.global-service', {
          populate: { 
            actions : true,
            clients :  true
          }
        }
      );

      if (modules.clients.some(i => i.id === this.state.client.id)) {
        this.globalService.push(...modules.actions);
      }
    } catch (error) {
      console.log(error, 'hey')
    }
  }

  async getActions(service, src = 'local') {
    await this.getClientsApps();

    const generalParams = '({ apps, actions })';
    
    const _regexServices = new RegExp("{{local.*}}|{{global.*}}", "gim");
    let action;

    if (src === 'global') {
        if (this.globalService.length === 0) {
            await this.getGlobalService();
        }
        
        action = await this.globalService.find(i => i.name === service);
    } else {
        action = await strapi.service('api::service.service').findOneByField({ name: service, client: { id: this.state.client.id } });
    }

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
                    await this.getActions(_serviceName, _src);
                }
            }
        }

        // add all actions for nested
        if (!this.state.actions) {
          this.state.actions = {
            local: {},
            global: {}
          }
        }

        this.state.actions[src][service] = eval(`async ${generalParams} => { ${action.event} }`);
    }
  }
}

module.exports =
  ({ strapi }) =>
  (state) => {
    return new ServiceEventHandler(state);
  };

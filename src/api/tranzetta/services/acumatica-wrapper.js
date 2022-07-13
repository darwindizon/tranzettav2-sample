const OauthClient = require('client-oauth2');
const axios = require('axios');
const HttpWrapper = require('./helpers/http-wrapper');
const Encrypter = require('./utils/encrypter')


class AcumaticaClient extends HttpWrapper {
  constructor(account, data) {
    super()

    strapi.log.info(JSON.stringify(account));

    this.data = data;
    this.account = account;

    this.OauthClient = new OauthClient({
      clientId: account.clientId,
      clientSecret: account.clientSecret,
      accessTokenUri: `${account.baseUrl}/identity/connect/token`,
      scopes: ['api'],
    });
    
    
    this.login();
  }

  async login() {
    let accessToken = ""; //this.account.token.accessToken; // for testing

    if (!accessToken) {
      const encrypter = new Encrypter(process.env.ENCRYPT_SECRET);
      const password = encrypter.dencrypt(this.account.password);

      const token = await this.OauthClient.owner.getToken(this.account.username, password)
              .catch((err) => {  
                strapi.log.error(JSON.stringify(err));
              });

      accessToken = token ? token.accessToken : "";

      this.data.apps.some((i) => {
        if(i.id === this.account.id) {
          i.token.accessToken = accessToken;
          return true;
        }
      });

      // update access token in db
      await strapi.service('api::client.client').update(this.data.id, { data: this.data });
    }

    this.axios = axios.create({
      baseURL: `${this.account.baseUrl}/entity/Default/${this.account.apiVersion}`,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
  
  async getProduct(id, query) {
    try {
      return await this.get(`/StockItem/${id}`, query);
    } catch(err) {
      console.log(err, 'asdasd')
    }
  }
}

module.exports =
  ({ strapi }) =>
  (account, data) => {
    return new AcumaticaClient(account, data);
  };

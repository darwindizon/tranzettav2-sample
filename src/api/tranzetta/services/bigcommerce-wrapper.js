const OauthClient = require('client-oauth2');
const axios = require('axios');
const HttpWrapper = require('./helpers/http-wrapper');

class BigcommerceClient extends HttpWrapper {
  constructor(account) {
    super()

    strapi.log.info(JSON.stringify(account));
    
    this.account = account;

    this.OauthClient = new OauthClient({
      clientId: account.clientId,
      clientSecret: account.clientSecret,
      accessTokenUri: account.accessTokenUri,
      authorizationUri: account.authorizationUri,
      redirectUri: account.redirectUri,
      scopes: account.scopes,
    });

    this.axios = axios.create({
      baseURL: `${account.baseUrl}/${account.version}`,
      headers: {
        ['X-Auth-Token']: account.accessToken,
      },
    });
  }

  // Categories API
  async getCategories(query) {
    return await this.get('/catalog/categories', query);
  }

  async createCategory(data) {
    return await this.post('/catalog/categories', data);
  }
  
  async deleteCategory(categoryId, query) {
    return await this.delete(`/catalog/categories/${categoryId}`, query);
  }
}

module.exports =
  ({ strapi }) =>
  (account) => {
    return new BigcommerceClient(account);
  };

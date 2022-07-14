const OauthClient = require('client-oauth2');
const axios = require('axios');
const HttpWrapper = require('./helpers/http-wrapper');
class BigcommerceClient extends HttpWrapper {
  constructor(account) {
    super()

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
      baseURL: `${account.baseUrl}/${account.storeHash}/${account.apiVersion}`,
      headers: {
        ['X-Auth-Token']: account.accessToken,
      },
    });
    
    this.axios.interceptors.response.use(
      response => {
        return response;
      },
      async error => {
        return error?.response?.data;
      },
    );
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

  async createCategoryBatch(data) {
    return await this.post('catalog/trees/categories', data);
  }

  async deleteCategoryBatch(query) {
    return await this.delete('catalog/trees/categories', query);
  }

  async updateCategoryBatch(data, query) {
    return await this.put('catalog/trees/categories', data, query);
  }

  async createProductCustomField(productId, data) {
    return await this.post(`catalog/products/${productId}/custom-fields`, data);
  }

  async updateProductCustomField(productId, customFieldId, data) {
    return await this.post(`catalog/products/${productId}/custom-fields/${customFieldId}`, data);
  }

  async createCustomerAttributes(productId, customFieldId, data) {
    return await this.post(`catalog/products/${productId}/custom-fields/${customFieldId}`, data);
  }

}

module.exports =
  ({ strapi }) =>
  (account) => {
    return new BigcommerceClient(account);
  };

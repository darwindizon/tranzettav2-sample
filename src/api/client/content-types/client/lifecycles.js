module.exports = {
    async afterCreate(event) {
      const { result } = event;

      //get token
      const token = await strapi.service('api::tranzetta.token')(result).generateToken();
      //save token
      await strapi.service('api::client.client').update(result.id, { data: { token: token } });
    }
};
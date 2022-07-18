module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    await next(); 
  };

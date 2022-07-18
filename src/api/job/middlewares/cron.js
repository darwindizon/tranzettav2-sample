module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    console.log(global.manager, "HEEEEEEEEEEEEEEEEEEEEEEEYYYYY");
    await next(); 
  };

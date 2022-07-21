'use strict';

/**
 * A set of functions called "actions" for `tranzetta`
 */
module.exports = {
  connection: async (ctx, next) => {
    const { actions } = ctx.state
    const { service } = ctx.params
    const { scope } = ctx.query;
    
    let result;
    try {
      result = await actions[(scope ?? 'local')][service](ctx.state);
    } catch (error) {

      return ctx.badRequest('Invalid Service', {
        message: error.message
      });
    }

    await next();

    return result;
  },
};

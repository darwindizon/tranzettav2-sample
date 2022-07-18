module.exports = (plugin) => {
   let createOriginal = plugin.controllers['collection-types'].create;
   let deleteOriginal = plugin.controllers['collection-types'].delete;
   let updateOriginal = plugin.controllers['collection-types'].update;

    plugin.controllers['collection-types'].update = async (ctx) => {
         await updateOriginal(ctx);
         console.log(global.manager);
     };

     plugin.controllers['collection-types'].delete = async (ctx) => {
        await deleteOriginal(ctx);
        console.log(global.manager);
     };

     plugin.controllers['collection-types'].create = async (ctx) => {
        await createOriginal(ctx);
        console.log(global.manager);
     };
  
    return plugin;
};
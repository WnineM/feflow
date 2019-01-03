'use strict';

// 如何使用
// let promisifyPluginFn = usePlugin('@nine/nine-plugin-eeee', 'eeee'); 
// promisifyPluginFn.then(function(pluginReturn){
//   console.log(pluginReturn, 111111)
// }, (pluginReturn)=>{
// });

// to make class
const spawn = require('cross-spawn');
const pathFn = require('path');

function usePlugin(pluginName, pluginCmd, ctx, args) {
   const { log, pluginDir, baseDir , loadPlugin} = ctx;
   return new Promise(function (resolve, reject) {
      const c = ctx.cmd.get(pluginCmd);
      if (c) {
        log.info(`${pluginName} 插件已安装, 即将执行插件命令...`);
        resolve(c.call(ctx, args));
      } else {
        log.info(`检测到您本地没有安装${pluginName}插件, 即将为您安装...`);
        const loading = new ctx.utils.Loading(`正在安装${pluginName}，请稍等`);
        return execNpmCommand('install', pluginName, false, baseDir, ctx).then((result)=>{
          if (!result.code) {
          loading.success();
          return usePluginAfterInstall(pluginName, pluginCmd, ctx, args);
        } else {
          const err = `${pluginName} 插件安装失败，失败码为${result.code}，错误日志为${result.data}`;
          loading.fail(err);
          log.error(err);
        }
        });

      }
    });
}

function usePluginAfterInstall(pluginName, pluginCmd, ctx, args){
  const { log, pluginDir, baseDir , loadPlugin} = ctx;
  log.info(`${pluginName} 插件安装完成, 即将执行插件命令...`);
  let path = require.resolve(pathFn.join(pluginDir, pluginName));
  return loadPlugin(path, null, ctx).then(()=>{
    return new Promise(function (resolve, reject) {
        const c = ctx.cmd.get(pluginCmd);

        resolve(c.call(ctx, args));
      });
  }).catch(function (err) {
    ctx.log.error({err: err}, 'Plugin load failed: %s');
  });;

}


function execNpmCommand(cmd, modules, isGlobal, where, ctx) {
    const {registry, proxy} = ctx.config;
    const log = ctx.log;

    return new Promise((resolve, reject) => {
      let args = [cmd].concat(modules).concat('--color=always').concat('--save');
      if (isGlobal) {
        args = args.concat('-g');
      }
      if (registry) {
        // args = args.concat(`--registry=${registry}`);
      }
      if (proxy) {
        args = args.concat(`--proxy=${proxy}`);
      }
        args = args.concat('--registry=http://r.npm.sankuai.com');

      log.debug(args);
      const npm = spawn('npm', args, {cwd: where});

      let output = '';
      npm.stdout.on('data', (data) => {
        output += data;
      }).pipe(process.stdout);

      npm.stderr.on('data', (data) => {
        output += data;
      }).pipe(process.stderr);

      npm.on('close', (code) => {
        if (!code) {
          resolve({cod: 0, data: output});
        } else {
          reject({code: code, data: output});
        }
      });
    });
}

module.exports = usePlugin;
const { processYml } = require('yaml-dot-resolve');

(async () => {
  const yml = [
    'custom:',
    '  dev:',
    '    cpu: 256',
    'cpu: ${custom.${custom.stage}.cpu}',
  ].join('\n');

  const doc = await processYml(yml, 'dev');
  const js = doc.toJS();
  console.log('cpu:', js.cpu);
})();

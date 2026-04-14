import { describe, expect, test } from 'vitest';
import { processYml } from './process';

describe('recursive-yml processYml', () => {
  test('resolves ${custom.stage} placeholder to the given stage', async () => {
    const yml = 'stage: ${custom.stage}';
    const stage = 'dev';
    const doc = await processYml(yml, stage);
    const obj = doc.toJS();
    expect(obj.custom).toEqual({ stage: 'dev' });
    expect(obj.stage).toBe('dev');
  });

  test('resolves same placeholder in multiple keys', async () => {
    const yml = 'stage: ${custom.stage}\nenv: ${custom.stage}';
    const doc = await processYml(yml, 'staging');
    const obj = doc.toJS();
    expect(obj.stage).toBe('staging');
    expect(obj.env).toBe('staging');
  });

  test('resolves multiple placeholders in one value', async () => {
    const yml = 'combined: ${custom.stage}-${custom.stage}';
    const doc = await processYml(yml, 'prod');
    const obj = doc.toJS();
    expect(obj.combined).toBe('prod-prod');
  });

  test('replaces node with object when placeholder resolves to object', async () => {
    const yml = 'custom:\n  foo: bar\nref: ${custom}';
    const doc = await processYml(yml, 'dev');
    const obj = doc.toJS();
    expect(obj.ref).toEqual({ foo: 'bar', stage: 'dev' });
  });

  test('throws when path contains dash and key does not exist', async () => {
    const yml = 'key: ${some-dashed-path}';
    await expect(processYml(yml, 'dev')).rejects.toThrow(
      'Placeholder path not found: some-dashed-path',
    );
  });

  test('throws when path contains space', async () => {
    const yml = 'key: ${custom stage}';
    await expect(processYml(yml, 'dev')).rejects.toThrow(
      'Invalid placeholder path: segment cannot contain spaces',
    );
  });

  test('throws when placeholder is unclosed', async () => {
    const yml = 'key: ${custom.stage';
    await expect(processYml(yml, 'dev')).rejects.toThrow(
      'Malformed placeholder: unclosed delimiter (missing closing })',
    );
  });

  test('resolves nested placeholder when entire value is one ${...}', async () => {
    const yml = [
      'custom:',
      '  dev:',
      '    cpu: 256',
      'cpu: ${custom.${custom.stage}.cpu}',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().cpu).toBe(256);
  });

  test('resolves nested placeholder in mixed string', async () => {
    const yml = [
      'custom:',
      '  dev:',
      '    cpu: 256',
      'label: "cpu=${custom.${custom.stage}.cpu}"',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().label).toBe('cpu=256');
  });

  test('throws when mixed string placeholder resolves to object', async () => {
    const yml = 'custom:\n  foo: bar\nmixed: "ref=${custom}"';
    await expect(processYml(yml, 'dev')).rejects.toThrow(
      'Cannot embed non-primitive value in mixed placeholder string: custom',
    );
  });

  test('preserves null when single placeholder resolves to null', async () => {
    const yml = 'data:\n  val: null\nref: ${data.val}';
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().ref).toBe(null);
  });

  test('resolves 3-level nested placeholder in single-placeholder node', async () => {
    const yml = [
      'levels:',
      '  a: b',
      '  b: c',
      '  c: final',
      'result: ${levels.${levels.${levels.a}}}',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().result).toBe('final');
  });

  test('resolves multiple different placeholders in one value', async () => {
    const yml = 'a: hello\nb: world\nc: ${a}-${b}';
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().c).toBe('hello-world');
  });

  test('throws when placeholder path does not exist in context', async () => {
    const yml = 'key: ${nonexistent.path}';
    await expect(processYml(yml, 'dev')).rejects.toThrow(
      'Placeholder path not found: nonexistent.path',
    );
  });

  test('replaces node with array when placeholder resolves to array', async () => {
    const yml = 'items:\n  - a\n  - b\nref: ${items}';
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().ref).toEqual(['a', 'b']);
  });

  test('preserves number type when single placeholder resolves to number', async () => {
    const yml = 'config:\n  port: 3000\nref: ${config.port}';
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().ref).toBe(3000);
  });

  test('preserves boolean type when single placeholder resolves to boolean', async () => {
    const yml = 'config:\n  enabled: true\nref: ${config.enabled}';
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().ref).toBe(true);
  });

  test('resolves stage-based config lookup (trinity.yml pattern)', async () => {
    const yml = [
      'custom:',
      '  dev:',
      '    instanceType: t3.micro',
      '    cpu: 256',
      '  prod:',
      '    instanceType: t3.medium',
      '    cpu: 1024',
      'stacks:',
      '  HTTPApi:',
      '    instanceType: ${custom.${custom.stage}.instanceType}',
      '    cpu: ${custom.${custom.stage}.cpu}',
    ].join('\n');
    const doc = await processYml(yml, 'prod');
    const obj = doc.toJS();
    expect(obj.stacks.HTTPApi.instanceType).toBe('t3.medium');
    expect(obj.stacks.HTTPApi.cpu).toBe(1024);
  });

  test('resolves nested placeholder to object when entire value is one ${...}', async () => {
    const yml = [
      'custom:',
      '  dev:',
      '    cpu: 256',
      '    mem: 512',
      'config: ${custom.${custom.stage}}',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().config).toEqual({ cpu: 256, mem: 512 });
  });

  test('resolves two sibling nested placeholders in mixed string', async () => {
    const yml = [
      'custom:',
      '  dev:',
      '    cpu: 256',
      '    mem: 512',
      'label: "${custom.${custom.stage}.cpu}-${custom.${custom.stage}.mem}"',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().label).toBe('256-512');
  });

  test('resolves chained placeholder where resolved value contains another placeholder', async () => {
    const yml = [
      'actual: 42',
      'ref: ${actual}',
      'chain: ${ref}',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().chain).toBe(42);
  });

  test('resolves nested placeholder where inner value is a dotted path', async () => {
    const yml = [
      'paths:',
      '  target: deep.value',
      'deep:',
      '  value: found',
      'result: ${${paths.target}}',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().result).toBe('found');
  });

  test('resolves nested placeholder as first path segment (dynamic root)', async () => {
    const yml = [
      'selector: services',
      'services:',
      '  port: 8080',
      'result: ${${selector}.port}',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().result).toBe(8080);
  });

  test('resolves two adjacent nested placeholders forming a path', async () => {
    const yml = [
      'ns: custom',
      'env: dev',
      'custom:',
      '  dev: works',
      'result: ${${ns}.${env}}',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().result).toBe('works');
  });

  test('throws when inner nested path is unresolvable', async () => {
    const yml = [
      'custom:',
      '  dev:',
      '    cpu: 256',
      'result: ${custom.${missing}.cpu}',
    ].join('\n');
    await expect(processYml(yml, 'dev')).rejects.toThrow(
      'Unresolved placeholder reference: missing',
    );
  });

  test('resolves hyphenated key via bracket notation when key exists', async () => {
    const yml = [
      'some-dashed-path: resolved',
      'key: ${some-dashed-path}',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    expect(doc.toJS().key).toBe('resolved');
  });

  test('throws when hyphenated path has no match after normalization', async () => {
    const yml = 'key: ${no-such-key.foo}';
    await expect(processYml(yml, 'dev')).rejects.toThrow(
      'Placeholder path not found: no-such-key.foo',
    );
  });

  test('throws when placeholders are cyclic', async () => {
    const yml = 'a: ${b}\nb: ${a}';
    await expect(processYml(yml, 'dev')).rejects.toThrow(
      'Placeholder resolution exceeded maximum depth (50)',
    );
  });

  test('resolves nested placeholders in multiple independent nodes', async () => {
    const yml = [
      'custom:',
      '  dev:',
      '    cpu: 256',
      '    mem: 512',
      'cpuRef: ${custom.${custom.stage}.cpu}',
      'memRef: ${custom.${custom.stage}.mem}',
    ].join('\n');
    const doc = await processYml(yml, 'dev');
    const obj = doc.toJS();
    expect(obj.cpuRef).toBe(256);
    expect(obj.memRef).toBe(512);
  });
});

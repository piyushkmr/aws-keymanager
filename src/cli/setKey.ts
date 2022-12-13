import { cli } from './cli';
import { isCli } from './';
import { setParameter } from '../commands';
import k from 'kleur';
import { commandActionHandler, handlePromiseResponse } from './utils';

const __cwd = process.cwd();

interface SetKeyOptions {
  description?: string;
  encrypt?: boolean;
  env?: string;
  name: string;
  value: string;
}

const getVariableName = (name: string, value: string, options: SetKeyOptions) => {
  if (!options.env && name.indexOf('/') !== 0) { // no env, and name not starts with `/`
    throw new Error('Name of the variable, should start with `/` for root variable, or provide --env');
  }
  if (!options.env) {
    if (name.indexOf('/') !== 0) {
      throw new Error('Name of the variable, should start with `/` for root variable, or provide --env');
    }
    if (name.split('/').length < 3) { // has only starting slash, remove it to add it to root
      name = name.slice(1, name.length);
      return name;
    }
    if (name.split('/').length >= 3) { // has multiple slash
      return name;
    }
  } else {
    if (name.indexOf('/') === 0) { // has starting slash, then no effect of env
      console.warn(k.yellow('Variable name starts with `/`, so env has not effect on this'));
      name = getVariableName(name, value, { ...options, env: undefined });
      return name;
    }
    name = `/${options.env}/${name}`;
    return name;
  }
};

const getNameValueFromArg = (name: string, value: string, options: SetKeyOptions) => {
  if (!value && name.indexOf('=') === -1) { // no value and no =
    throw new Error('Value missing from command, either pass value as argument or pass variable in format of NAME=value');
  }
  if (name.indexOf('=') !== -1) { // found equal
    const [keyName, keyValue] = name.split('=');
    name = keyName.trim();
    value = keyValue.trim();
  }

  name = getVariableName(name, value, options);

  return { name, value };
}

export const setKey = (name: string, value: string, options: SetKeyOptions) => {
  const parsedNameValue = getNameValueFromArg(name, value, options);
  name = parsedNameValue.name;
  value = parsedNameValue.value;

  if (isCli()) {
    console.debug(k.yellow(`Adding variable [${name}=${value}]`));
  }

  return setParameter({
    name: name,
    value: value,
    encrypt: options.encrypt,
    description: options.description,
    env: options.env,
  }).then(() => {
    return handlePromiseResponse({
      _cliMessage: `Parameter created Successfully [${name}]`,
    });
  });
};

export const registerSetKey = () => {
  cli.command('setKey')
    .argument('<name>', 'Name of the variable, should start with `/` for root variable, or provide --env')
    .argument('[value]', 'Value of variable to be stored')
    .option('-e, --env <env>', "Env for which to add variable, one of `'development'|'staging'|'production'`")
    .option('-d, --description <description>', "Description to be added to parameter")
    .option('-x, --encrypt', 'Whether to store encrypted parameter')
    .action(commandActionHandler(setKey));
}

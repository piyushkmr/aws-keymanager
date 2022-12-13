import { cli } from './cli';
import { getParameter, setParameter } from '../commands';
import k from 'kleur';
import { CLIResponse, commandActionHandler, handlePromiseResponse } from './utils';

const __cwd = process.cwd();

interface GetKeyOptions {
  env?: string;
}

const getVariableName = (name: string, options: GetKeyOptions) => {
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
      name = getVariableName(name, { ...options, env: undefined });
      return name;
    }
    name = `/${options.env}/${name}`;
    return name;
  }
};

interface GetKeyResponse {
  name: string;
  value: string;
  arn: string;
  type: string;
}

export const getKey = async (name: string, options: GetKeyOptions) => {
  name = getVariableName(name, options);

  return getParameter(name).then((resp) => {
    let response: CLIResponse<GetKeyResponse>;
    if (resp.Parameter) {
      response = {
        name: resp.Parameter.Name,
        value: resp.Parameter.Value,
        arn: resp.Parameter.ARN,
        type: resp.Parameter.Type,
        _cliMessage: resp.Parameter.Value,
      };
    } else {
      response = {
        code: 404,
        _cliMessage: `Parameter Not Found [${name}]`,
      }
    }
    return handlePromiseResponse(response);
  });
};

export const registerGetKey = () => {
  cli.command('getKey')
    .argument('<name>', 'Name of the variable, should start with `/` for root variable, or provide --env')
    .option('-e, --env handlePromiseInCli<env>', "Env for which to add variable, one of `'development'|'staging'|'production'`")
    .option('-d, --description <description>', "Description to be added to parameter")
    .action(commandActionHandler(getKey));
}

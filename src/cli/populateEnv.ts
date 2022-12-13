// command populateEnv --file .envList --env dev --out .env
// read envList
// get variableNames with prefix dev
// variable names will be fetched with absolute path that start with /
// get variable values
// Create config file in .env/dev.env

import { cli } from './cli';
import fs from 'fs';
import path from 'path';
import { getParameters } from '../commands';
import { commandActionHandler, handlePromiseResponse, writeFilePathSync } from './utils';

const __cwd = process.cwd();
const DEFAULT_ENV_LIST = '.envList';

interface PopulateEnvOptions {
  /**
   * Env name, one of `'development'|'staging'|'production'`
   */
  env: string;
  /**
   * File to get variable name list
   * @default `.envList`
   */
  file?: string;
  /**
   * Output file, for server deployment
   * @default `.env/<env>`
   */
  out?: string;
}

const getEnvList = (options: PopulateEnvOptions) => {
  const file = path.join(__cwd, options.file || DEFAULT_ENV_LIST); 
  // if (!fs.existsSync(file)) {
  //   throw new Error(`Env list file not found at location: ${file}`);
  // }
  const envListFile = fs.readFileSync(file).toString();
  if (!envListFile) {
    throw new Error('Env list file is empty');
  }
  const envListLines = envListFile.split('\n').map((line) => line.trim()).filter((line) => !!line);

  return envListLines;
}

const getAbsoluteEnvName = (envLine: string, options: PopulateEnvOptions) => {
  if (envLine.indexOf('/') === 0) { // Variable name starts with `/`, then its absolute name
    return envLine.replace(/^\//, '');
  }
  const envName = `/${options.env}/${envLine}`;
  return envName;
}

const convertJSONToEnvVar = (obj: Record<string, string>) => {
  const envVars = Object.keys(obj).map((envName) => `${envName}=${obj[envName]}\n`).join('');
  return envVars;
};

const getParametersSingleBatch = (parameterNames: string[]) => {
  const envVariables: Record<string, string> = {};
  return getParameters(parameterNames).then((resp) => {
    const { Parameters, InvalidParameters } = resp;
    if (InvalidParameters.length > 0) {
      const invalidParams = InvalidParameters.map((param) => `✘ ${param}`).join('\n');
      console.warn(`${InvalidParameters.length} Parameters were not found in Parameter Store:\n${invalidParams}`);
    }
    Parameters.map((parameter) => {
      const { Name, Value } = parameter;
      const nameParts = Name.split('/');
      const variableName = nameParts[nameParts.length - 1];
      envVariables[variableName] = Value;
    });
    return envVariables;
  });
};

const getParametersInBatches = async (parameterNames: string[], batchSize = 10) => {
  let envVariables: Record<string, string> = {};
  const batchCount = Math.ceil(parameterNames.length / batchSize);
  for (let batchNumber = 0; batchNumber < batchCount; batchNumber++) {
    const thisBatchParameters = parameterNames.slice(batchNumber * batchSize, (batchNumber + 1) * batchSize);
    const thisBatchEnvVariables = await getParametersSingleBatch(thisBatchParameters);
    envVariables = { ...envVariables, ...thisBatchEnvVariables };
  }
  return envVariables;
};

export const populateEnv = async (options: PopulateEnvOptions) => {
  const { env } = options;
  const out = path.join(__cwd, options.out || `.env/${env}.env`);

  const envListLines = getEnvList(options);
  let envVariables: Record<string, string> = {};
  const envListNames = envListLines.map((envLine) => {
    if (!envLine.trim()) { // blank lines
      return;
    }
    if (envLine.indexOf('#') === 0) { // comment starting with 0;
      return;
    }
    if (envLine.indexOf('=') !== -1) { // Line has character `=`
      const [envName, envValue] = envLine.split('=');
      envVariables[envName.trim()] = envValue.trim();
      return;
    }
    return getAbsoluteEnvName(envLine, options);
  }).filter((envName) => !!envName); // Remove blanks
  console.log(`Need to fetch ${envListNames.length} variables`);

  const parametersValues = await getParametersInBatches(envListNames);
  envVariables = { ...parametersValues, ...envVariables };
  const envString = convertJSONToEnvVar(envVariables);
  writeFilePathSync(out, envString);
  return handlePromiseResponse({
    _cliMessage: `Populated .env file with variables`,
  });
};

export const registerPopulateEnv = () => {
  cli.command('populateEnv')
    .requiredOption('-e, --env <envName>', 'Env name, one of development|staging|production')
    .option('-f, --file <value>', 'File to get variable name list', '.envList')
    .option('-o, --out <outputFile>', 'Output file, for server deployment, you can use --out .env')
    .action(commandActionHandler(populateEnv));
}

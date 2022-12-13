const fs = require('fs');
const path = require('path');
const _dotenv = require('dotenv');

const DEFAULT_ENV = 'development';
const ENV_FILE = '.env';

const getEnvAlias = () => {
  const allEnvs = fs.readdirSync(path.resolve(process.cwd(), ENV_FILE));
  const envAlias = {
    'dev': 'development',
    'prod': 'production',
    'stag': 'staging',
    'local': 'localhost',
    'development': 'development',
    'production': 'production',
    'staging': 'staging',
    'localhost': 'localhost',
  };
  allEnvs.forEach((env) => envAlias[env] = env);
  return envAlias;
}

/**
 * @typedef {Object} DotenvConfigOptions
 * @property {string} [path=process.cwd()]
 * @property {string} [encoding=utf8]
 * @property {boolean} [debug=false]
 */

/**
 * 
 * @param {DotenvConfigOptions} options 
 */
const config = (options = {}) => {
  const ENV = process.env.ENV || DEFAULT_ENV;

  let envFilePath = path.resolve(process.cwd(), '.env');
  if (options.path) {
    envFilePath = options.path;
  } else {
    const envFolderExists = fs.existsSync(path.join(process.cwd(), ENV_FILE));
    if (envFolderExists) {
      const envFile = path.resolve(process.cwd(), ENV_FILE);;
      const isDir = fs.statSync(envFile).isDirectory();
      if (isDir) {
        const envAlias = getEnvAlias();
        const env = envAlias[ENV] || '';
        if (!env) {
          throw new Error(`Invalid ENV. Choose one of [${Object.keys(envAlias).join(', ')}], OR add file '${ENV}.env' inside ${ENV_FILE} directory.`);
        }
        envFilePath = path.resolve(envFile, `${env}.env`);
      } else {
        envFilePath = envFile;
      }
    }
  }
  if (!fs.existsSync(envFilePath)) {
    throw new Error(`✘ ENV ENOENT [${envFilePath}]`);
  }
  console.info(`✓ ENV file [${envFilePath}]`);
  options = Object.assign(options, { path: envFilePath });
  const envVars = _dotenv.config(options);
  return envVars;
}

const dotenv = {
  config: config,
};

module.exports = dotenv;

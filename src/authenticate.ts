import fs from 'fs';
import kleur from 'kleur';
import path from 'path';
import { isCli } from './cli';
import { prompt } from 'promptly';
import { homedir } from 'os';


const AWS_CREDENTIALS_LOCATION = `${homedir()}/.aws/credentials`;
interface AwsCredentials {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
}

const persistAWSCredentials = (credentials: AwsCredentials) => {
  if (fs.existsSync(AWS_CREDENTIALS_LOCATION)) {
    fs.unlinkSync(AWS_CREDENTIALS_LOCATION);
  }
  const fileContent = [
    '[default]',
    `aws_access_key_id=${credentials.AWS_ACCESS_KEY_ID}`,
    `aws_secret_access_key=${credentials.AWS_SECRET_ACCESS_KEY}`,
  ].join('\n');

  const filePathParts = AWS_CREDENTIALS_LOCATION.split(path.sep);
  const directory = filePathParts.slice(0, filePathParts.length - 1).join(path.sep);
  if (!fs.existsSync(directory)){
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(AWS_CREDENTIALS_LOCATION, fileContent);
  console.log(`Credentials stored at location ${AWS_CREDENTIALS_LOCATION}`);
};

const handleMissingCred = async () => {
  if (isCli()) {
    console.log(kleur.red('Unable to find AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY'));
    console.log(kleur.bold('To get your access key follow these steps:'));
    console.log('- Go to https://us-east-1.console.aws.amazon.com/iamv2/home#/users');
    console.log('- Search for your IAM user');
    console.log('- Choose your IAM user name (not the check box)');
    console.log('- Open the Security credentials tab, and then choose Create access key');
    console.log('For more details visit here: https://docs.aws.amazon.com/powershell/latest/userguide/pstools-appendix-sign-up.html');
    const AWS_ACCESS_KEY_ID = await prompt(kleur.yellow('Access key ID: '));
    const AWS_SECRET_ACCESS_KEY = await prompt(kleur.yellow('Secret access key: '));
    persistAWSCredentials({AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY});
    const credentials: AwsCredentials = {
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
    };
    return credentials;
  } else {
    throw new Error('ERR_AUTH: Unable to find `AWS_ACCESS_KEY_ID` and/or `AWS_SECRET_ACCESS_KEY`');
  }
}

const getCredentialsFromFile = () => {
  try {
    if (fs.existsSync(AWS_CREDENTIALS_LOCATION)) {
      const credentialFileContent = fs.readFileSync(AWS_CREDENTIALS_LOCATION).toString().split('\n');
      let AWS_ACCESS_KEY_ID = '';
      let AWS_SECRET_ACCESS_KEY = '';
      credentialFileContent.forEach((line) => {
        if (line.indexOf('aws_access_key_id') === 0) {
          const value = line.split('=')[1];
          AWS_ACCESS_KEY_ID = value.trim();
        }
        if (line.indexOf('aws_secret_access_key') === 0) {
          const value = line.split('=')[1];
          AWS_SECRET_ACCESS_KEY = value.trim();
        }
      });
      if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
        throw new Error('INVALID_CREDENTIALS: Credentials are not in correct format');
      }
      const credentials: AwsCredentials = {
        AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY,
      };
      return credentials;
    } else {
      throw new Error(`ENOENT: File not found at location ${AWS_CREDENTIALS_LOCATION}`);
    }
  } catch {
    return handleMissingCred();
  }
};

export const authenticate = async () => {
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  const AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION;

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    const accessKeys = await getCredentialsFromFile();
    return accessKeys;
  }

  return {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY
  };
}

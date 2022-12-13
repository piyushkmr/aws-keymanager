import {
  GetParameterCommand,
  GetParametersCommand,
  ParameterType,
  PutParameterCommand,
} from '@aws-sdk/client-ssm';
import { getClientSSM } from './clientSSM';

export const getParameter = async (parameterName: string) => {
  const command =  new GetParameterCommand({
    Name: parameterName,
    WithDecryption: true,
  });
  const clientSSM = await getClientSSM();
  return clientSSM.send(command);
};

export const getParameters = async (parameterNames: string[]) => {
  const command = new GetParametersCommand({
    Names: parameterNames,
    WithDecryption: true,
  });
  const clientSSM = await getClientSSM();
  return clientSSM.send(command);
};

interface PutParameterOptions {
  /**
   * The fully qualified name of the parameter that you want to add to the system.
   *
   * Naming Constraints:
   * - Hierarchy guideline - `/[envName]/[serviceName]/parameterName`
   * - Parameter names are case sensitive.
   * - Must be unique within an Amazon Web Services Region
   * - Can't be prefixed with `aws` or `ssm
   * - Can include only the following symbols and letters: `a-zA-Z0-9_.-`
   * - To create hierarchy, start with `/` character, e.g. `/dev/East/Project-ABC/MyParameter`
   *   - Parameter hierarchies are limited to a maximum depth of fifteen levels.</p>
   * 
   * [Documentation](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-su-create.html)
   */
  name: string;
  /**
   * Any UTF-8 compatible string
   */
  value: string | string[];
  encrypt?: boolean;
  description?: string;
  encryptionKeyId?: string;
  env?: string;
}

export const setParameter = async (parameter: PutParameterOptions) => {
  if (parameter.encrypt && Array.isArray(parameter.value)) {
    throw new Error('Only strings can be encrypted');
  }
  const type: ParameterType = parameter.encrypt ?
    ParameterType.SECURE_STRING : Array.isArray(parameter.value) ?
      ParameterType.STRING_LIST : ParameterType.STRING;

  const value = Array.isArray(parameter.value) ? parameter.value.join(',') : parameter.value;
  const keyId = parameter.encrypt ? parameter.encryptionKeyId || await getEncryptionKeyId(parameter.env) : undefined;

  const command =  new PutParameterCommand({
    Name: parameter.name,
    Value: value,
    Type: type,
    DataType: 'text',
    Description: parameter.description,
    KeyId: keyId,
  });
  const clientSSM = await getClientSSM();
  return clientSSM.send(command);
};

const setParameterIterator = (parameters: PutParameterOptions[], index: number = 0) => {
  const parametersCount = parameters.length;
  const thisParameter = parameters[index]
  setParameter(thisParameter).then(() => {
    index++;
    if (index < parametersCount) {
      setParameterIterator(parameters, index);
    }
  });
};

export const setParameters = (parameters: PutParameterOptions[]) => {
  setParameterIterator(parameters);
};

export const getEncryptionKeyId = async (env: string) => {
  const keyParameter = await getParameter(`/${env}/KMS_KEY_ID`);  
  if (keyParameter && keyParameter.Parameter) {
    return keyParameter.Parameter.Value;
  } else {
    throw new Error(`Encryption key not found for env [${env}]`);
  }
};

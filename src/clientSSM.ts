import { SSMClient } from '@aws-sdk/client-ssm';
import { authenticate } from './authenticate';

const ACCESS_KEY_ID = 'AKIAZSPPZZZX43G3FXUB';
const SECRET_ACCESS_KEY = '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';

let clientSSM: SSMClient;

export const getClientSSM = async () => {
  if (clientSSM) {
    return clientSSM;
  }

  const credentials = await authenticate();
  clientSSM = new SSMClient({
    region: "ap-south-1",
    credentials: {
      accessKeyId: credentials.AWS_ACCESS_KEY_ID,
      secretAccessKey: credentials.AWS_SECRET_ACCESS_KEY,
    },
  });
  return clientSSM;
}

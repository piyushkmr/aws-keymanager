import { isCli } from './';
import k from 'kleur';
import path from 'path';
import fs from 'fs';

type CLIError<T> = {
  code: number;
  _cliMessage: string;
} & Partial<T>;

type CLISuccess<T> = {
  code?: 0;
  _cliMessage: string;
} & T;

export type CLIResponse<T = Record<string, any>> = CLIError<T> | CLISuccess<T>;

export const handlePromiseResponse = <T>(resp: CLIResponse<T>) => {
  const isSuccess = resp.code ? !resp.code : !!resp;
  if (isSuccess) {
    if (isCli()) {
      const respMessage = resp._cliMessage ? resp._cliMessage : resp;
      console.log(respMessage);
      process.exit(0);
    } else {
      delete resp._cliMessage;
      return resp as T;
    }
  } else {
    if (isCli()) {
      const code = resp?.code || 1;
      resp._cliMessage && console.log(k.red(resp._cliMessage));
      console.log(`Process exited with error code: [${code}]`);
      process.exit(code);
    } else {
      if (resp !== null || resp !== undefined) {
        delete resp._cliMessage;
      }
      return resp as T;
    }
  }
}

export const commandActionHandler = <T extends any[]>(promiseFunction: (...args: T) => Promise<any>) => {
  return promiseFunction as (...args: T) => Promise<void>;
}

export const writeFilePathSync = (fullPath: string, content: string | Buffer) => {
  const filePathParts = fullPath.split(path.sep);
  const directory = filePathParts.slice(0, filePathParts.length - 1).join(path.sep);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
};

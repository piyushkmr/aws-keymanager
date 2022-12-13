#!/bin/env node
export { cli } from './cli';
import { cli } from './cli';
export { populateEnv } from './populateEnv';
import { registerPopulateEnv } from './populateEnv';
import { registerSetKey } from './setKey';
import { registerGetKey } from './getKey';

const _isCli = require.main === module ? true : false;

export const isCli = () => {
  return _isCli;
}

registerSetKey();
registerGetKey();
registerPopulateEnv();

cli.parse();

import { Command } from 'commander';

export const cli = new Command();

cli.name('key-manager')
  .description('keyManager for env secrets')
  .version('1.0.6');
  

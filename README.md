<center><img src="https://symbols.getvecta.com/stencil_16/35_parameter-store.6443ba24e4.png" height="80"/></center>
<center><h1>KeyManager</h1></center>

`key-manager` can be used to populate ENV (.env) files using [AWS parameter store](https://ap-south-1.console.aws.amazon.com/systems-manager/parameters/?region=ap-south-1&tab=Table#).

Key manager exposes 3 commands
- populateEnv _pick env names from .envList and create .env file_
  ```sh
  key-manager populateEnv --env development [--file .envList] [--out .env]
  ```
- setKey _set value of key in AWS parameter store_
  ```sh
  key-manager setKey VARIABLE_NAME=variableValue --env development [--description Desc] [--encrypt]
  ```
  Note, if key already exist in parameter store, you can't set it from here. Delete the key from parameter store then try this step again.

- getKey
  ```sh
  key-manager getKey KEY_NAME --env development
  ```

## How to use keymanager?

0. And add `.env` to .gitignore:
  ```sh
  # .gitignore
  .env
  ```
1. Add dependencies to package.json
  ```sh
  npm install --save dotenv aws-keymanager
  ```
  _OR_
  ```sh
  yarn add dotenv aws-keymanager
  ```

2. Create a `setup:env` script in `package.json`
  ```json
  "scripts": {
    "setup:env": "node node_modules/key-manager/cli/index.js populateEnv --env"
  }
  // Absolute path is needed for now, as there is some issue in importing cli packages from `.bin`
  ```
3. Create a `.envList` file
  ```sh
  ENV
  NODE_ENV
  PORT=3010 #hardcoded
  SERIVCE_NAME=service_name #hardcoded
  MONGO_URI
  REDIS_URL
  OPENSEARCH_DOMAIN
  OPENSEARCH_USERNAME
  OPENSEARCH_PASSWORD
  ...
  ```
  - All the lines without values will be fetched from AWS parameter store. If any value is provided (i.e. hard-coded) in env file (e.g. PORT=3010 in this case), it won't be fetched from parameter store.
  - Think it this way, if any value can change with change in env (development | production), then fetch it from AWS, otherwise hard-code it in .envList file.
  - If any env-independent variable still needs to be secured or fetched from AWS for any other reasons, it can still be fetched from AWS, more on that later.

4. Populate the env file to your nodejs application
  ```js
  import { config } from 'dotenv';
  config();
  ```

  - Using `@admitkard/dotenv` over `dotenv` enables you to **quick-switch env**.
  - By default key-manager creates variables under `.env/{envName}.env` file and it looks like this:
    ```
    .env
     |- development.env
     |- production.env
     |- staging.env
    ```
  - So now you change env on the fly `ENV=development npm start` or `ENV=production npm start` (no more fiddling with single env file).

## How to store env-independent variable in key-store?
- You can set any variable in keystore given it is root variable i.e. starts with `/`, e.g.
  ```sh
  key-manager setKey /MY_SERVICE/SERVICE_NAME=service_name
  # starts with `/`, no --env is needed now
  ```
- And then in `.envList`
  ```sh
  ...
  /MY_SERVICE/SERVICE_NAME
  ...
  ```
- Basically, all the variables starting with `/` will be env-independent and treated same for all env.

## Configure with Ansible
- To configure with ansible only a single change is needed.
  ```yaml
  - name: Starting server
    shell: |
      npm ci
      npm run setup:env development -- --out .env
      ENV=development pm2 start npm --name {{ process_name }} -- start ;
  ```
- Make sure that you are sending `package.json` along with your build bundle. So that you can install key-manager.


### Future Plans
- Make application more secure by loading variables in memory instead of `.env` file.
- Fix `key-manager` cli to be able to import directly from `.bin` instead of full path.
- Give a way to directly download key-manager without doing full npm install.

# Project setup

## Tools

Next, make sure you have installed [volta](http://volta.sh/) which ensures you have the right version of node and yarn for this project

You might also need [expo](https://docs.expo.io/get-started/installation/) to iterate on the client package

## Clone

Next, checkout a working copy of this project enter the directory you just created

## Install dependencies

[`yarn`](https://yarnpkg.com/) is the recommended package manager to use with this project. Please use it instead of npm.

Install dependencies with yarn by running

```sh
yarn
```

## Env variables

If you want to test the app as a whole you should fill a .env file for each package.
It involves to create several google api keys ( with billing account for google console )

## Starting the project

Start up the project in development mode by running

### Client

Start the expo app by running.

```sh
cd packages/client && yarn start
```

Then choose a platform where to run the app.

Changing any files in the folder will result in an incremental rebuild, and a refresh of the screen

### Server

First launch redis & postgres container:

```sh
cd packages/server && docker-compose up -d
```

Run the database migrations
( Until we've done the authenfication feature we need to seed the db using node ace db:seed )

```sh
node ace migration:rollback --batch 0 && node ace migration:run && node ace db:seed
```

Start the server:

```sh
yarn dev
```

By default, the server is served on https://localhost:3333.

Do not forget to set the env variables, if not the server won't start

### Temporal

First launch temporal server:

```sh
cd packages/temporal && yarn temporal
```

Start the api

```sh
yarn dev
```

Start the worker

```sh
yarn worker
```

If you got some errors from the two previous commands, just wait few minutes for the temporal server to be ready

## Utils

From musicRoom/

Build all the packages

```sh
yarn build
```

Clean all the packages

```sh
yarn clean
```

Lint

```sh
yarn lint
```

Run jest tests

```sh
yarn test
```

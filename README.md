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

First launch redis container:

```sh
cd packages/server && docker-compose -d
```

Start the server:

```sh
yarn dev
```

By default, the server is served on https://localhost:3333.

Do not forget to set the env variables, if not the server won't start

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

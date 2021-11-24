const { createMetroConfiguration } = require('expo-yarn-workspaces');
const blacklist = require('metro-config/src/defaults/blacklist');

const yarnWorkspacesConfiguration = createMetroConfiguration(__dirname);

module.exports = {
    ...yarnWorkspacesConfiguration,
    resolver: {
        ...yarnWorkspacesConfiguration.resolver,
        blacklistRE: blacklist([
            yarnWorkspacesConfiguration.resolver.blacklistRE,
            /packages\/server\/dist\/.*/,
        ]),
    },
};

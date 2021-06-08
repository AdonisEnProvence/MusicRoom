const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync(
        {
            ...env,
            babel: {
                dangerouslyAddModulePathsToTranspile: [
                    'dripsy',
                    '@dripsy/core',
                    'moti',
                    '@motify',
                ],
            },
        },
        argv,
    );

    return config;
};

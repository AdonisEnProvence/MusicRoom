/*
|--------------------------------------------------------------------------
| Validating Environment Variables
|--------------------------------------------------------------------------
|
| In this file we define the rules for validating environment variables.
| By performing validation we ensure that your application is running in
| a stable environment with correct configuration values.
|
| This file is read automatically by the framework during the boot lifecycle
| and hence do not rename or move this file to a different location.
|
*/

import Env from '@ioc:Adonis/Core/Env';

export default Env.rules({
    /** Database */
    DB_CONNECTION: Env.schema.string(),
    POSTGRESQL_ADDON_HOST: Env.schema.string({ format: 'host' }),
    POSTGRESQL_ADDON_PORT: Env.schema.number(),
    POSTGRESQL_ADDON_USER: Env.schema.string(),
    POSTGRESQL_ADDON_PASSWORD: Env.schema.string.optional(),
    POSTGRESQL_ADDON_DB: Env.schema.string(),
    /** ******** */

    GOOGLE_API_KEY: Env.schema.string(),
    GOOGLE_GEOCODING_API_KEY: Env.schema.string(),
    HOST: Env.schema.string({ format: 'host' }),
    PORT: Env.schema.number(),
    APP_KEY: Env.schema.string(),
    APP_NAME: Env.schema.string(),
    NODE_ENV: Env.schema.enum([
        'development',
        'production',
        'testing',
    ] as const),
    REDIS_CONNECTION: Env.schema.enum(['local'] as const),
    REDIS_HOST: Env.schema.string({ format: 'host' }),
    REDIS_PORT: Env.schema.number(),
    REDIS_PASSWORD: Env.schema.string.optional(),
    SESSION_DRIVER: Env.schema.string(),

    SMTP_HOST: Env.schema.string({ format: 'host' }),
    SMTP_PORT: Env.schema.number(),
    SMTP_USERNAME: Env.schema.string(),
    SMTP_PASSWORD: Env.schema.string(),

    TEMPORAL_ADONIS_KEY: Env.schema.string(),
    ADONIS_TEMPORAL_KEY: Env.schema.string(),
});

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
    PG_HOST: Env.schema.string({ format: 'host' }),
    PG_PORT: Env.schema.number(),
    PG_USER: Env.schema.string(),
    PG_PASSWORD: Env.schema.string.optional(),
    PG_DB_NAME: Env.schema.string(),
    /** ******** */

    GOOGLE_API_KEY: Env.schema.string(),
    GOOGLE_PLACES_API_KEY: Env.schema.string(),
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
});

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/
// import Redis from '@ioc:Adonis/Addons/Redis';
import Redis from '@ioc:Adonis/Addons/Redis';
import HealthCheck from '@ioc:Adonis/Core/HealthCheck';
import Route from '@ioc:Adonis/Core/Route';

Route.get('/search/track/:query', 'TracksSearchesController.searchTrackName');

Route.get('/', async () => {
    const report = await HealthCheck.getReport();
    console.log(report.report.redis.meta);
    await Redis.publish('music', JSON.stringify({ id: '1' }));

    return { hello: 'world' };
});

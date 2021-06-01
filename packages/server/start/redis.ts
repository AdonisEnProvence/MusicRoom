/*
|--------------------------------------------------------------------------
| Preloaded File
|--------------------------------------------------------------------------
|
| Any code written inside this file will be executed during the application
| boot.
|
*/

import Redis from '@ioc:Adonis/Addons/Redis';

Redis.subscribe('music', (user: string) => {
    console.log(JSON.parse(user));
});

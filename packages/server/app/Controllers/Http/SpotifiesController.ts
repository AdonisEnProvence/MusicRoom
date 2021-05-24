import fetch from 'node-fetch';
import querystring from 'query-string';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

const stateKey = 'spotify_auth_state';
const spotifyAuth = {
    client_id: '61140504dfd14dd591dbfdd22d8a253a',
    client_secret: '77fb7aff655f4581a972f3bc5ebeed82',
    redirect_uri: 'http://localhost:3333/spotify/callback',
};

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = (length: number): string => {
    let text = '';
    const possible =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

export default class SpotifiesController {
    public static login({ response }: HttpContextContract): void {
        const state = generateRandomString(16);
        response.cookie(stateKey, state);

        // your application requests authorization
        const scope = 'user-read-private user-read-email';
        const queries: string = querystring.stringify({
            response_type: 'code',
            client_id: spotifyAuth.client_id,
            scope: scope,
            redirect_uri: spotifyAuth.redirect_uri,
            state: state,
        });
        response.redirect(`https://accounts.spotify.com/authorize?${queries}`);
    }

    public static async callback({
        request,
        response,
    }: HttpContextContract): Promise<void> {
        const { code, state, error } = request.qs();
        const storedState = request.cookie(stateKey);
        console.log('[callback]');
        console.log(state, storedState);
        if (!error) {
            if (state !== null && state === storedState) {
                response.clearCookie(stateKey);
                try {
                    const auth = `Basic ${Buffer.from(
                        spotifyAuth.client_id + ':' + spotifyAuth.client_secret,
                    ).toString('base64')}`;
                    const res = await fetch(
                        'https://accounts.spotify.com/api/token',
                        {
                            method: 'POST',
                            body: querystring.stringify({
                                grant_type: 'authorization_code',
                                code,
                                redirect_uri: spotifyAuth.redirect_uri,
                            }),
                            headers: {
                                'Content-Type':
                                    'application/x-www-form-urlencoded',
                                Authorization: auth,
                            },
                        },
                    );
                    console.log('response from spotify /api/token');
                    console.log(res.status, res.ok, res.statusText);
                    const body = await res.text();
                    console.log(body);
                    // const access_token = body.access_token;
                    // const refresh_token = body.refresh_token;
                    // console.log(`succes\n${access_token} | ${refresh_token}`);
                } catch (e) {
                    console.log(e);
                }
            } else {
                const msg: string = querystring.stringify({
                    error: 'state_mismatch',
                });
                response.redirect(`/#${msg}`);
            }
        } else {
            const msg: string = querystring.stringify({
                error: error,
            });
            return response.redirect(`/#${msg}`);
        }
    }

    public static ping(): void {
        console.log('pong');
    }
}

// app.get('/refresh_token', function (req, res) {
//     // requesting access token from refresh token
//     var refresh_token = req.query.refresh_token;
//     var authOptions = {
//         url: 'https://accounts.spotify.com/api/token',
//         headers: {
//             Authorization:
//                 'Basic ' +
//                 new Buffer(client_id + ':' + client_secret).toString('base64'),
//         },
//         form: {
//             grant_type: 'refresh_token',
//             refresh_token: refresh_token,
//         },
//         json: true,
//     };

//     request.post(authOptions, function (error, response, body) {
//         if (!error && response.statusCode === 200) {
//             var access_token = body.access_token;
//             res.send({
//                 access_token: access_token,
//             });
//         }
//     });
// });

/**
 * Contract source: https://git.io/Jte3T
 *
 * Feel free to let us know via PR, if you find something broken in this config
 * file.
 */

import Bouncer from '@ioc:Adonis/Addons/Bouncer';
import { TokenTypeName } from '@musicroom/types';
import User from 'App/Models/User';
import { DateTime } from 'luxon';

/*
|--------------------------------------------------------------------------
| Bouncer Actions
|--------------------------------------------------------------------------
|
| Actions allows you to separate your application business logic from the
| authorization logic. Feel free to make use of policies when you find
| yourself creating too many actions
|
| You can define an action using the `.define` method on the Bouncer object
| as shown in the following example
|
| ```
| 	Bouncer.define('deletePost', (user: User, post: Post) => {
|			return post.user_id === user.id
| 	})
| ```
|
|****************************************************************
| NOTE: Always export the "actions" const from this file
|****************************************************************
*/
export const { actions } = Bouncer.define('confirmEmail', (user: User) => {
    const isEmailAlreadyConfirmed = user.confirmedEmailAt !== null;
    const canConfirmEmail = isEmailAlreadyConfirmed === false;

    return canConfirmEmail === true;
}).define('resendConfirmationEmail', async (user: User) => {
    const confirmationEmailTokensGeneratedDuringLastHour = await user
        .related('tokens')
        .query()
        .whereHas('tokenType', (query) => {
            return query.where('name', TokenTypeName.enum.EMAIL_CONFIRMATION);
        })
        .andWhere('createdAt', '>', DateTime.now().minus({ hours: 1 }).toSQL());
    const confirmationEmailTokensGeneratedDuringLastHourCount =
        confirmationEmailTokensGeneratedDuringLastHour.length;

    const hasReachedRateLimit =
        confirmationEmailTokensGeneratedDuringLastHourCount >= 3;
    const hasNotReachedRateLimit = hasReachedRateLimit === false;
    const canResendConfirmationEmail = hasNotReachedRateLimit === true;

    return canResendConfirmationEmail === true;
});

/*
|--------------------------------------------------------------------------
| Bouncer Policies
|--------------------------------------------------------------------------
|
| Policies are self contained actions for a given resource. For example: You
| can create a policy for a "User" resource, one policy for a "Post" resource
| and so on.
|
| The "registerPolicies" accepts a unique policy name and a function to lazy
| import the policy
|
| ```
| 	Bouncer.registerPolicies({
|			UserPolicy: () => import('App/Policies/User'),
| 		PostPolicy: () => import('App/Policies/Post')
| 	})
| ```
|
|****************************************************************
| NOTE: Always export the "policies" const from this file
|****************************************************************
*/
export const { policies } = Bouncer.registerPolicies({});

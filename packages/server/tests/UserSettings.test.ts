import Database from '@ioc:Adonis/Lucid/Database';
import { UserSettingVisibility } from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { initTestUtils } from './utils/TestUtils';

test.group('User settings', (group) => {
    const { disconnectEveryRemainingSocketConnection, initSocketConnection } =
        initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        sinon.restore();
        await Database.rollbackGlobalTransaction();
    });

    test(`'PUBLIC' is the default setting for playlists, relations and devices visibility settings`, async (assert) => {
        const userID = datatype.uuid();
        const user = await User.create({
            uuid: userID,
            nickname: random.word(),
        });
        // Necessary, otherwise all columns of the row are not present.
        await user.refresh();

        await user.load('playlistsVisibilitySetting');
        await user.load('relationsVisibilitySetting');
        await user.load('devicesVisibilitySetting');

        assert.equal<UserSettingVisibility>(
            user.playlistsVisibilitySetting.name,
            'PUBLIC',
        );

        assert.equal<UserSettingVisibility>(
            user.relationsVisibilitySetting.name,
            'PUBLIC',
        );

        assert.equal<UserSettingVisibility>(
            user.devicesVisibilitySetting.name,
            'PUBLIC',
        );
    });
});

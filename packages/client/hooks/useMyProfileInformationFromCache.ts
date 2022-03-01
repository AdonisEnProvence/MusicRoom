import { MyProfileInformation } from '@musicroom/types';
import { useMachine } from '@xstate/react';
import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { getFakeUserID } from '../contexts/SocketContext';
import { createMyProfileInformationMachine } from '../machines/myProfileInformationMachine';
import { getMyProfileInformation } from '../services/UsersSearchService';
import { useRefreshOnFocus } from './useRefreshOnFocus';

interface UseGetMyProfileInformationFromCache {
    userNotFound: boolean;
    myProfileInformation: undefined | MyProfileInformation;
}

export function useGetMyProfileInformationFromCache(): UseGetMyProfileInformationFromCache {
    const [state, sendToMyProfileMachine] = useMachine(() =>
        createMyProfileInformationMachine(),
    );

    const { data, status, refetch } = useQuery<MyProfileInformation, Error>(
        'myProfileInformation',
        () =>
            getMyProfileInformation({
                tmpAuthUserID: getFakeUserID(),
            }),
    );

    useEffect(() => {
        if (status === 'success' && data) {
            sendToMyProfileMachine({
                type: 'RETRIEVE_MY_PROFILE_INFORMATION_SUCCESS',
                myProfileInformation: data,
            });
        } else if (status === 'error') {
            sendToMyProfileMachine('RETRIEVE_MY_PROFILE_INFORMATION_FAILURE');
        }
    }, [data, status, sendToMyProfileMachine]);

    useRefreshOnFocus(refetch);

    return {
        myProfileInformation: state.context.myProfileInformation,
        userNotFound: state.hasTag('userNotFound'),
    };
}

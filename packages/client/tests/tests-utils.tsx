import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { MtvRoomUsersListElement } from '@musicroom/types';
import {
    render as rtlRender,
    RenderAPI,
    RenderOptions,
    waitFor,
} from '@testing-library/react-native';
import { DripsyProvider } from 'dripsy';
import { datatype } from 'faker';
import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from 'react-query';
import invariant from 'tiny-invariant';
import { AppContextProvider } from '../contexts/AppContext';
import { SocketContextProvider } from '../contexts/SocketContext';
import { useTheme } from '../hooks/useTheme';
import Navigation from '../navigation';
import { ServerSocket, serverSocket } from '../services/websockets';

export type SizeTerms = 'xs' | 's' | 'm' | 'l' | 'xl';
export type BackgroundTerms = 'primary' | 'seconday' | 'white' | 'text';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            cacheTime: 0,
        },
    },
});

const AllTheProviders: React.FC = ({ children }) => {
    const { theme } = useTheme();

    return (
        <QueryClientProvider client={queryClient}>
            <DripsyProvider theme={theme}>
                <SafeAreaProvider
                    initialMetrics={{
                        frame: { x: 0, y: 0, width: 0, height: 0 },
                        insets: { top: 0, left: 0, right: 0, bottom: 0 },
                    }}
                >
                    <BottomSheetModalProvider>
                        <SocketContextProvider>
                            <AppContextProvider setDisplayModal={noop}>
                                {children}
                            </AppContextProvider>
                        </SocketContextProvider>
                    </BottomSheetModalProvider>
                </SafeAreaProvider>
            </DripsyProvider>
        </QueryClientProvider>
    );
};

export * from '@testing-library/react-native';

export function render(
    component: React.ReactElement<unknown>,
    options?: RenderOptions,
): RenderAPI & { serverSocket: ServerSocket } {
    const utils = rtlRender(component, {
        wrapper: AllTheProviders,
        ...options,
    });

    return {
        ...utils,
        serverSocket,
    };
}

/**
 * Renders the application <Navigation /> component.
 * It renders asynchronously the first screen.
 * This function waits for the home screen to be rendered before returning.
 */
export async function renderApp(
    options?: RenderOptions,
): Promise<RenderAPI & { serverSocket: ServerSocket }> {
    const screen = render(
        <Navigation colorScheme="dark" toggleColorScheme={noop} />,
        options,
    );

    await waitFor(() => {
        expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);
    });

    return screen;
}

export function waitForTimeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

export function noop(): void {
    return undefined;
}

/**
 * Returns a fake users list array
 * First element will always be the creator
 * @param directMode if true the default delegation owner will be the creator
 * @param isMeIsCreator if true creator will also be "me"
 * @returns
 */
export function getFakeUsersList({
    directMode,
    isMeIsCreator,
}: {
    directMode: boolean;
    isMeIsCreator?: boolean;
}): MtvRoomUsersListElement[] {
    const len = 5;
    const minRandomIndex = 1;

    const getRandomIndex = () =>
        Math.floor(
            Math.random() * (len - 1 - minRandomIndex + 1) + minRandomIndex,
        );

    const getFakeUser = (index: number): MtvRoomUsersListElement => ({
        hasControlAndDelegationPermission: false,
        isCreator: false,
        isDelegationOwner: false,
        isMe: false,
        nickname: `${datatype.uuid()}_${index}`,
        userID: datatype.uuid(),
    });

    const fakeUsersArray: MtvRoomUsersListElement[] = Array.from({
        length: len,
    }).map((_, index) => getFakeUser(index));

    fakeUsersArray[0] = {
        ...fakeUsersArray[0],
        isCreator: true,
        hasControlAndDelegationPermission: true,
        isDelegationOwner: directMode || false,
        isMe: isMeIsCreator || false,
    };

    if (!isMeIsCreator) {
        const isMeIndex = getRandomIndex();
        fakeUsersArray[isMeIndex].isMe = true;
    }

    return fakeUsersArray;
}

export function extractTrackIDFromCardContainerTestID(testID: string): string {
    const result = /(?:mpe-|mtv-|)(?<trackID>.+)-track-card-container/.exec(
        testID,
    );
    invariant(result !== null, 'Pattern was not recognized');
    invariant(
        result.groups !== undefined,
        'Could not retrieve any trackID from regex',
    );

    const trackID = result.groups.trackID;
    invariant(
        typeof trackID === 'string',
        'TrackID named group has not been captured',
    );

    return trackID;
}

export function toTrackCardContainerTestID({
    trackID,
    testIDPrefix,
}: {
    trackID: string;
    testIDPrefix?: string;
}): string {
    return [testIDPrefix, trackID, 'track-card-container']
        .filter((chunk) => chunk !== undefined)
        .join('-');
}

export function testGetFakeUserID(): string {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
        const userIDFromLocalStorage = window.localStorage.getItem('USER_ID');
        if (typeof userIDFromLocalStorage === 'string') {
            return userIDFromLocalStorage;
        }
    }

    return Platform.OS === 'web'
        ? 'f5ddbf01-cc01-4422-b347-67988342b558'
        : '9ed60e96-d5fc-40b3-b842-aeaa75e93972';
}

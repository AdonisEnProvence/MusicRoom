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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppContextProvider } from '../contexts/AppContext';
import { SocketContextProvider } from '../contexts/SocketContext';
import { useTheme } from '../hooks/useTheme';
import Navigation from '../navigation';
import { ServerSocket, serverSocket } from '../services/websockets';

export type SizeTerms = 'xs' | 's' | 'm' | 'l' | 'xl';
export type BackgroundTerms = 'primary' | 'seconday' | 'white' | 'text';

const AllTheProviders: React.FC = ({ children }) => {
    const { theme } = useTheme();

    return (
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
    return testID.replace('-track-card-container', '');
}

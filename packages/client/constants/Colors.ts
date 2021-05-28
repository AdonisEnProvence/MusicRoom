import { ColorSchemeName } from 'react-native';

interface Palette {
    primary: string;
    secondary: string;
    text: string;
    white: string;
    headerBackground: string;
}

const darkPalette = {
    primary: '#212121',
    secondary: '#1db954',
    text: '#fff',
    white: '#fff',
    headerBackground: '#121212',
};

const lightPalette = {
    primary: '#FF9533',
    secondary: '#000',
    text: '#000',
    white: '#fff',
    headerBackground: '#FE6D35',
};

interface navigationStyle {
    backgroundColor: string;
    headerTintColor: string;
    fontWeight: 'bold';
}

const navigationPalette: { dark: navigationStyle; light: navigationStyle } = {
    light: {
        backgroundColor: lightPalette.headerBackground,
        headerTintColor: lightPalette.white,
        fontWeight: 'bold',
        // text: '#fff',
        // background: '#191414',
        // tint: tintColorLight,
        // tabIconDefault: '#ccc',
        // tabIconSelected: tintColorLight,
    },
    dark: {
        backgroundColor: darkPalette.headerBackground,
        headerTintColor: darkPalette.white,
        fontWeight: 'bold',
        // text: darkPalette.text,
        // background: darkPalette.primary,
        // tint: darkPalette.secondary,
        // tabIconDefault: '#ccc',
        // tabIconSelected: darkPalette.secondary,
    },
};

export const navigationStyle = (scheme: ColorSchemeName): navigationStyle => {
    switch (scheme) {
        case 'dark':
            return navigationPalette.dark;
        case 'light':
            return navigationPalette.light; //todo
        default:
            return navigationPalette.dark;
    }
};

export const colorPalette = (scheme: ColorSchemeName): Palette => {
    switch (scheme) {
        case 'dark':
            return darkPalette;
        case 'light':
            return lightPalette;
        default:
            return darkPalette;
    }
};

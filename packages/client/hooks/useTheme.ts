import { Theme } from 'dripsy';
import { useState } from 'react';
import { colorPalette } from '../constants/Colors';

type ApplicationTheme = 'dark' | 'light';

interface UseThemeReturn {
    colorScheme: ApplicationTheme;
    theme: Theme;
    toggleColorScheme: () => void;
}

export const GLOBAL_THEME_CONSTANTS = {
    space: {
        none: 0,
        xs: 2,
        s: 4,
        m: 8,
        l: 16,
        xl: 24,
        xxl: 48,
    },
    borderWidths: {
        s: 1,
        m: 2,
        l: 3,
    },
    fontSizes: {
        xxs: 12,
        xs: 14,
        s: 16,
        m: 20,
        l: 24,
        xl: 32,
    },
    radii: {
        s: 5,
        m: 10,
        l: 15,
        full: 9999,
    },
};

export function useTheme(): UseThemeReturn {
    const [colorScheme, setColorScheme] = useState<ApplicationTheme>('dark');
    const palette = colorPalette(colorScheme);
    // Default breakpoints
    // [0-575, 576-767, 768-991, 992-x]
    const theme: Theme = {
        colors: {
            ...palette,
        },
        ...GLOBAL_THEME_CONSTANTS,
        sizes: {
            m: 24,
        },
    };

    const toggleColorScheme = () => {
        setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
    };

    return {
        colorScheme,
        theme,
        toggleColorScheme,
    };
}

/**
 * @packageDocumentation
 *
 * <img src="https://placecorgi.herokuapp.com/300/250" align="right" />
 *
 * <h3>Why does this library exist?</h3>
 *
 * `@shlack/types` is a package containing broadly-useful
 * types and type guards for our demo slack app. This is part of Mike's
 * <b>JS & TS Monorepos Course</b> which you can learn more about by visiting
 * <a href="https://github.com/mike-north/js-ts-monorepos/" target="_blank">
 *  the repo on GitHub
 * </a>
 *
 * If you want to watch a recorded video of this course, look for it
 * on <a href="https://frontendmasters.com" target="_blank">FrontEnd Masters</a>
 *
 *
 * @remarks
 * All interfaces are prefixed with `I`
 *
 * @packageDocumentation
 */

/**
 * @public
 */
export enum Ahah {
    'LOL' = 'LOL',
    'MDR' = 'MDR',
}

/**
 * @public
 */
export type Eheh = keyof typeof Ahah;

/**
 * @public
 */
export const ResponseToUniverse = 42;

export * from './appMusicPlayerMachine';
export * from './http';
export * from './TemporalToServer';
export * from './websockets';

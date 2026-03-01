import { env } from '$env/dynamic/public';

/**
 * Application-wide configuration constants.
 *
 * Values are read from environment variables with sensible defaults.
 */

/** The display name of the application, used across all pages and meta tags. */
export const APP_NAME = 'RestaurantPro';

/** Primary support email shown to users throughout the app. */
export const SUPPORT_EMAIL = env.PUBLIC_SUPPORT_EMAIL || 'support@example.com';

/**
 * Endfield/SKPORT API Types
 * Type definitions for Endfield service interactions
 */

/** Result of a single role's attendance check-in */
export interface EndfieldRoleResult {
    gameRole: string;
    success: boolean;
    message: string;
    rewards?: string;
    already?: boolean;
    tokenExpired?: boolean;
}

/** Result of an Endfield claim attempt (may include multiple roles) */
export interface EndfieldClaimResult {
    success: boolean;
    message: string;
    results?: EndfieldRoleResult[];
    tokenExpired?: boolean;
}

/** Options for creating EndfieldService */
export interface EndfieldServiceOptions {
    /** ACCOUNT_TOKEN from web-api.skport.com/cookie_store/account_token */
    accountToken: string;
    /** Language code (default: "en") */
    language?: string;
}

/** Validation result for Endfield parameters */
export interface EndfieldValidation {
    valid: boolean;
    message?: string;
}

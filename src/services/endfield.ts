import axios from "axios";
import { performOAuthFlow, generateSignV2, type OAuthCredentials } from "./endfield-oauth";

export interface EndfieldClaimResult {
    success: boolean;
    message: string;
    alreadyClaimed?: boolean;
    rewards?: Array<{ name: string; count: number; icon: string }>;
}

interface CachedCredentials extends OAuthCredentials {
    obtainedAt: number;
}

// Credential cache (in-memory, refreshed on demand)
const credentialCache = new Map<string, CachedCredentials>();
const CREDENTIAL_TTL = 25 * 60 * 1000; // 25 minutes (refresh before 30min expiry)

const ATTENDANCE_URL = "https://zonai.skport.com/web/v1/game/endfield/attendance";
const PLATFORM = "3";
const VERSION = "4.2.0";

const DEFAULT_HEADERS = {
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0",
    Origin: "https://www.skport.com",
    Referer: "https://www.skport.com/"
};

export class EndfieldService {
    private accountToken?: string;
    private legacyCred?: string;
    private id: string;
    private server: string;
    private cacheKey: string;

    constructor(options: {
        accountToken?: string;
        legacyCred?: string;
        gameId: string;
        server?: string;
    }) {
        this.accountToken = options.accountToken;
        this.legacyCred = options.legacyCred;
        this.id = options.gameId;
        this.server = options.server || "2";
        this.cacheKey = `${this.id}_${this.server}`;
    }

    /**
     * Get or refresh OAuth credentials
     */
    private async getCredentials(): Promise<{ cred: string; salt: string } | null> {
        // Check cache first
        const cached = credentialCache.get(this.cacheKey);
        if (cached && Date.now() - cached.obtainedAt < CREDENTIAL_TTL) {
            console.log(`[Endfield] Using cached credentials for ${this.id}`);
            return { cred: cached.cred, salt: cached.salt };
        }

        // Try OAuth flow with accountToken
        if (this.accountToken) {
            try {
                console.log(`[Endfield] Refreshing OAuth credentials for ${this.id}...`);
                const credentials = await performOAuthFlow(this.accountToken);
                const cached: CachedCredentials = {
                    ...credentials,
                    obtainedAt: Date.now()
                };
                credentialCache.set(this.cacheKey, cached);
                console.log(`[Endfield] OAuth credentials refreshed successfully`);
                return { cred: credentials.cred, salt: credentials.salt };
            } catch (error: any) {
                console.error(`[Endfield] OAuth refresh failed: ${error.message}`);
                // Fall through to legacy if available
            }
        }

        // Fallback to legacy cred (no salt = can't use v2 signing)
        if (this.legacyCred) {
            console.log(`[Endfield] Using legacy cred (v1 signing only)`);
            return { cred: this.legacyCred, salt: "" };
        }

        return null;
    }

    /**
     * Validates if the provided parameters are in correct format
     */
    static validateParams(
        token: string,
        id: string,
        server: string
    ): { valid: boolean; message?: string; isAccountToken?: boolean } {
        console.log(`[Endfield] Validating params - UID: ${id}, Server: ${server}, Token length: ${token?.length || 0}`);

        if (!token || token.length < 20) {
            console.log(`[Endfield] ❌ Validation failed: Token too short`);
            return { valid: false, message: "❌ Token too short. Provide valid account_token or SK_OAUTH_CRED_KEY." };
        }
        if (!id || !/^\d+$/.test(id)) {
            console.log(`[Endfield] ❌ Validation failed: Game UID must be numeric`);
            return { valid: false, message: "❌ Game UID must be numeric." };
        }
        if (server !== "2" && server !== "3") {
            console.log(`[Endfield] ❌ Validation failed: Invalid server`);
            return { valid: false, message: "❌ Invalid server. Use 2 (Asia) or 3 (Americas/Europe)." };
        }

        // Heuristic: account_token is typically longer and contains specific patterns
        const isAccountToken = token.length > 100 || token.includes(".");
        console.log(`[Endfield] ✅ Validation passed (isAccountToken: ${isAccountToken})`);
        return { valid: true, isAccountToken };
    }

    async claim(): Promise<EndfieldClaimResult> {
        const credentials = await this.getCredentials();
        if (!credentials) {
            return {
                success: false,
                message: "No valid credentials available. Please re-setup with /setup-endfield."
            };
        }

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const skGameRole = `3_${this.id}_${this.server}`;

        // Build headers
        const headers: Record<string, string> = {
            ...DEFAULT_HEADERS,
            cred: credentials.cred,
            "sk-game-role": skGameRole,
            "sk-language": "en",
            platform: PLATFORM,
            timestamp,
            vName: VERSION,
            dId: ""
        };

        // Add v2 signature if we have salt (from OAuth)
        if (credentials.salt) {
            const sign = generateSignV2("/web/v1/game/endfield/attendance", timestamp, PLATFORM, VERSION, credentials.salt);
            headers["sign"] = sign;
            console.log(`[Endfield] Using v2 signing`);
        } else {
            console.log(`[Endfield] ⚠️ No salt available, skipping v2 signing`);
        }

        console.log(`[Endfield] Attempting claim for UID: ${this.id}, Server: ${this.server}`);

        try {
            const response = await axios.post(ATTENDANCE_URL, {}, {
                headers,
                timeout: 30000
            });

            const responseJson = response.data;
            console.log(`[Endfield] Response:`, JSON.stringify(responseJson));

            // code 0 = success
            if (responseJson.code === 0) {
                const data = responseJson.data;

                // Check if already claimed today
                if (data?.hasToday) {
                    console.log(`[Endfield] 🔄 Already claimed today`);
                    return {
                        success: true,
                        message: "Already signed in today",
                        alreadyClaimed: true
                    };
                }

                // Extract rewards if present
                const rewards: Array<{ name: string; count: number; icon: string }> = [];
                if (data?.awardIds && data?.resourceInfoMap) {
                    for (const award of data.awardIds) {
                        const info = data.resourceInfoMap[award.id];
                        if (info) {
                            rewards.push({
                                name: info.name,
                                count: info.count,
                                icon: info.icon || ""
                            });
                        }
                    }
                }

                console.log(`[Endfield] ✅ Claim successful!`);
                return {
                    success: true,
                    message: "OK",
                    rewards
                };
            }

            // Handle message-based responses (legacy format)
            const checkInResult = responseJson.message || "Unknown";
            const isAlreadyClaimed = checkInResult.includes("already") || checkInResult.includes("Already");

            console.log(`[Endfield] ${isAlreadyClaimed ? "🔄" : "⚠️"} Result: ${checkInResult}`);
            return {
                success: isAlreadyClaimed,
                message: checkInResult,
                alreadyClaimed: isAlreadyClaimed
            };
        } catch (error: any) {
            console.error(`[Endfield] ❌ Request error:`, error.message);

            if (error.response) {
                console.error(`[Endfield] Error status: ${error.response.status}`);
                console.error(`[Endfield] Error data:`, JSON.stringify(error.response.data));

                const errMessage = error.response.data?.message || "Request failed";
                return {
                    success: false,
                    message: errMessage
                };
            }

            return {
                success: false,
                message: error.message || "Request failed"
            };
        }
    }

    /**
     * Clear cached credentials for this account (useful after re-setup)
     */
    clearCache(): void {
        credentialCache.delete(this.cacheKey);
    }

    /**
     * Static method to clear all cached credentials
     */
    static clearAllCache(): void {
        credentialCache.clear();
    }
}

export function formatEndfieldResult(result: EndfieldClaimResult): string {
    if (result.success) {
        if (result.alreadyClaimed) {
            return `🔄 **Arknights: Endfield**: ${result.message}`;
        }

        let text = `✅ **Arknights: Endfield**: ${result.message}`;
        if (result.rewards && result.rewards.length > 0) {
            const rewardList = result.rewards.map(r => `${r.name} x${r.count}`).join(", ");
            text += ` (${rewardList})`;
        }
        return text;
    }
    return `❌ **Arknights: Endfield**: ${result.message}`;
}

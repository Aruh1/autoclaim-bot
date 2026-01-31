import axios from 'axios';

export interface EndfieldClaimResult {
    success: boolean;
    message: string;
    alreadyClaimed?: boolean;
}

// Exact URL from canaria3406/skport-auto-sign
const ATTENDANCE_URL = 'https://zonai.skport.com/web/v1/game/endfield/attendance';

// Exact headers from canaria3406/skport-auto-sign
const DEFAULT_HEADERS = {
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0',
};

/**
 * Endfield claim service based on canaria3406/skport-auto-sign
 * @param SK_OAUTH_CRED_KEY - your skport SK_OAUTH_CRED_KEY in cookie
 * @param id - your Endfield game id
 * @param server - Asia=2 Americas/Europe=3
 * @param language - english=en 日本語=ja 繁體中文=zh_Hant 简体中文=zh_Hans 한국어=ko Русский=ru_RU
 */
export async function claimEndfield(
    SK_OAUTH_CRED_KEY: string,
    id: string,
    server: string = '2',
    language: string = 'en'
): Promise<EndfieldClaimResult> {
    // Build headers exactly like canaria3406
    const headers = {
        ...DEFAULT_HEADERS,
        'cred': SK_OAUTH_CRED_KEY,
        'sk-game-role': `3_${id}_${server}`,
        'sk-language': language,
    };

    try {
        const response = await axios.post(ATTENDANCE_URL, null, {
            headers,
            timeout: 30000,
        });

        const responseJson = response.data;
        const checkInResult = responseJson.message || 'Unknown';

        // OK = success (exactly like canaria3406 checks)
        if (checkInResult === 'OK') {
            return {
                success: true,
                message: 'OK',
            };
        }

        // Already claimed or other message
        return {
            success: checkInResult.includes('already') || checkInResult.includes('Already'),
            message: checkInResult,
            alreadyClaimed: checkInResult.includes('already') || checkInResult.includes('Already'),
        };
    } catch (error: any) {
        // Handle axios error responses
        if (error.response?.data) {
            const checkInResult = error.response.data.message || 'Request failed';
            return {
                success: false,
                message: checkInResult,
            };
        }
        return {
            success: false,
            message: error.message || 'Request failed',
        };
    }
}

// Class wrapper for compatibility with existing code
export class EndfieldService {
    private SK_OAUTH_CRED_KEY: string;
    private id: string;
    private server: string;
    private language: string;

    constructor(SK_OAUTH_CRED_KEY: string, id: string, server: string = '2', language: string = 'en') {
        this.SK_OAUTH_CRED_KEY = SK_OAUTH_CRED_KEY;
        this.id = id;
        this.server = server;
        this.language = language;
    }

    async claim(): Promise<EndfieldClaimResult> {
        return claimEndfield(this.SK_OAUTH_CRED_KEY, this.id, this.server, this.language);
    }
}

export function formatEndfieldResult(result: EndfieldClaimResult): string {
    if (result.success) {
        if (result.alreadyClaimed) {
            return `🔄 **Arknights: Endfield**: ${result.message}`;
        }
        return `✅ **Arknights: Endfield**: ${result.message}`;
    }
    return `❌ **Arknights: Endfield**: ${result.message}`;
}

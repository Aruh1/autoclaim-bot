---
name: SKPORT Auto-Claim
description: Implementation patterns for SKPORT/Endfield daily check-in with OAuth flow
---

# SKPORT Auto-Claim Skill

This skill covers SKPORT (Arknights: Endfield) API integration for auto-claim with OAuth.

## Authentication

### OAuth Flow (Recommended)
Uses `account_token` from Gryphline to dynamically obtain credentials.

```typescript
// Step 1: Get basic info
GET https://as.gryphline.com/user/info/v1/basic?token={accountToken}

// Step 2: Grant OAuth code  
POST https://as.gryphline.com/user/oauth2/v2/grant
Body: { token: accountToken, appCode: "6eb76d4e13aa36e6", type: 0 }

// Step 3: Exchange for credentials
POST https://zonai.skport.com/web/v1/user/auth/generate_cred_by_code
Body: { code: grantCode, kind: 1 }
Headers: { platform: "3", Origin: "https://www.skport.com" }

// Returns: { cred, token (salt), userId }
```

### Credential TTL
- OAuth credentials expire after ~30 minutes
- Recommend refresh at 25-minute intervals

## Signing

### V1 Sign (Basic endpoints)
```typescript
function generateSignV1(timestamp: string, cred: string): string {
    return crypto.createHash("md5")
        .update(`timestamp=${timestamp}&cred=${cred}`)
        .digest("hex");
}
```

### V2 Sign (Attendance, /card/detail, /wiki/, /binding, /enums, /v2/)
```typescript
function generateSignV2(
    path: string, 
    timestamp: string, 
    platform: string, 
    vName: string, 
    salt: string
): string {
    const headerJson = JSON.stringify({ platform, timestamp, dId: "", vName });
    const s = `${path}${timestamp}${headerJson}`;
    const hmac = crypto.createHmac("sha256", salt).update(s).digest("hex");
    return crypto.createHash("md5").update(hmac).digest("hex");
}
```

## Daily Check-in API

### Endpoint
```
POST https://zonai.skport.com/web/v1/game/endfield/attendance
```

### Headers
```typescript
const headers = {
    cred: credentials.cred,
    "sk-game-role": `3_${uid}_${server}`, // 3=Endfield, server: 2=Asia, 3=Americas/EU
    "sk-language": "en",
    platform: "3",
    timestamp: Math.floor(Date.now() / 1000).toString(),
    vName: "4.2.0",
    dId: "",
    sign: generateSignV2(path, timestamp, platform, vName, salt)
};
```

### Response Codes
| code | Meaning |
|------|---------|
| `0` | Success |
| `0` + `hasToday: true` | Already claimed |
| Non-zero | Error (check message) |

### Success Response
```json
{
    "code": 0,
    "data": {
        "awardIds": [{ "id": "..." }],
        "resourceInfoMap": {
            "id": { "name": "...", "count": 1, "icon": "..." }
        }
    }
}
```

## How to Get account_token

1. Login to https://www.skport.com
2. Open F12 DevTools
3. Go to **Application** → **Local Storage** → `https://www.skport.com`
4. Copy the `account_token` value

## Service Implementation Pattern

```typescript
export class EndfieldService {
    constructor(options: {
        accountToken?: string;  // Preferred: OAuth token
        legacyCred?: string;    // Fallback: static cred
        gameId: string;
        server?: string;
    }) {}
    
    async claim(): Promise<EndfieldClaimResult> {
        // 1. Get/refresh credentials via OAuth
        // 2. Build headers with v2 signing
        // 3. POST to attendance endpoint
        // 4. Parse response and return result
    }
}
```

## Error Handling
- Retry OAuth refresh on 401/403 errors
- Cache credentials in-memory with 25-min TTL
- Clear cache on user re-setup
- Fallback to legacy cred if OAuth fails

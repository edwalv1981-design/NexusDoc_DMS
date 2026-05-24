'use strict';

/**
 * pg 8.x treats sslmode=require in the URL like verify-full unless uselibpqcompat=true.
 * Supabase pooler certs otherwise fail with "self-signed certificate in certificate chain"
 * even when dialectOptions.ssl.rejectUnauthorized is false.
 */
function normalizePostgresScheme(url) {
    let normalized = String(url || '').trim();
    if (normalized.startsWith('postgresql://')) {
        normalized = normalized.replace('postgresql://', 'postgres://');
    }
    return normalized;
}

function prepareDatabaseUrlForPg(url) {
    const normalized = normalizePostgresScheme(url);
    if (!normalized) return normalized;

    try {
        const parsed = new URL(normalized);
        if (parsed.searchParams.has('sslmode') && !parsed.searchParams.has('uselibpqcompat')) {
            parsed.searchParams.set('uselibpqcompat', 'true');
        }
        return parsed.toString();
    } catch {
        return normalized;
    }
}

module.exports = {
    normalizePostgresScheme,
    prepareDatabaseUrlForPg,
};

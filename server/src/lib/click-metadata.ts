import { createHash, createHmac } from 'node:crypto';
import { UAParser } from 'ua-parser-js';
import { isBot } from 'ua-parser-js/bot-detection';
import { env } from '../config/env.js';

export const UNKNOWN_VALUE = 'Unknown';

const MAX_USER_AGENT_LENGTH = 512;
const MAX_REFERRER_LENGTH = 2048;
const MAX_METADATA_VALUE_LENGTH = 64;
const MAX_IP_LENGTH = 64;

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';

export interface UserAgentInfo {
  deviceType: DeviceType;
  browser: string;
  os: string;
}

export interface ReferrerInfo {
  referrerHost: string | null;
  referrerUrl: string | null;
}

export interface ClickMetadataInput {
  ip: string;
  userAgent: string;
  referrer: string | undefined;
  now: Date;
}

export interface ClickMetadata extends ReferrerInfo, UserAgentInfo {
  visitorHash: string;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function knownOrUnknown(value: string | undefined): string {
  const normalized = value?.trim();

  return normalized ? truncate(normalized, MAX_METADATA_VALUE_LENGTH) : UNKNOWN_VALUE;
}

function toDeviceType(ua: string, deviceType: string | undefined): DeviceType {
  if (isBot(ua)) {
    return 'bot';
  }

  switch (deviceType) {
    case 'mobile':
      return 'mobile';
    case 'tablet':
      return 'tablet';
    case undefined:
      // Desktop browsers do not report a device type; anything else
      // (console, TV, wearable, embedded) is not a device we report on.
      return 'desktop';
    default:
      return 'unknown';
  }
}

/**
 * Parse a user agent into the device, browser, and OS fields stored for a
 * click. Empty or unparseable agents are recorded as `unknown` rather than
 * failing the redirect.
 */
export function parseUserAgent(userAgent: string): UserAgentInfo {
  const ua = truncate(userAgent, MAX_USER_AGENT_LENGTH);

  if (ua.trim() === '') {
    return { deviceType: 'unknown', browser: UNKNOWN_VALUE, os: UNKNOWN_VALUE };
  }

  try {
    const result = UAParser(ua);

    return {
      deviceType: toDeviceType(ua, result.device.type),
      browser: knownOrUnknown(result.browser.name),
      os: knownOrUnknown(result.os.name),
    };
  } catch {
    return { deviceType: 'unknown', browser: UNKNOWN_VALUE, os: UNKNOWN_VALUE };
  }
}

/**
 * Extract the referring host and URL. Only absolute http(s) referrers are
 * recorded; anything malformed or overly long is dropped.
 */
export function parseReferrer(referrer: string | undefined): ReferrerInfo {
  if (!referrer || referrer.length > MAX_REFERRER_LENGTH) {
    return { referrerHost: null, referrerUrl: null };
  }

  try {
    const parsed = new URL(referrer);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { referrerHost: null, referrerUrl: null };
    }

    // A referrer can carry basic-auth credentials; never persist those.
    const hasCredentials = parsed.username !== '' || parsed.password !== '';

    if (hasCredentials) {
      parsed.username = '';
      parsed.password = '';
    }

    return {
      referrerHost: parsed.hostname === '' ? null : parsed.hostname,
      referrerUrl: truncate(parsed.href, MAX_REFERRER_LENGTH),
    };
  } catch {
    return { referrerHost: null, referrerUrl: null };
  }
}

/**
 * The visitor hash rotates daily: the salt is an HMAC of the UTC date keyed
 * by the server secret, and the hash covers the IP, user agent, and salt.
 * Raw IPs are never persisted or logged.
 */
export function computeVisitorHash(ip: string, userAgent: string, now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  const salt = createHmac('sha256', env.CLICK_HASH_SECRET)
    .update(`snip-visitor-salt:${day}`)
    .digest('hex');

  return createHash('sha256')
    .update(`${salt}|${truncate(ip, MAX_IP_LENGTH)}|${truncate(userAgent, MAX_USER_AGENT_LENGTH)}`)
    .digest('hex');
}

export function buildClickMetadata(input: ClickMetadataInput): ClickMetadata {
  return {
    ...parseUserAgent(input.userAgent),
    ...parseReferrer(input.referrer),
    visitorHash: computeVisitorHash(input.ip, input.userAgent, input.now),
  };
}

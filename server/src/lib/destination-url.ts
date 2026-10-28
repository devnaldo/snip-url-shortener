import { BlockList, isIP } from 'node:net';
import { env } from '../config/env.js';

export const MAX_DESTINATION_URL_LENGTH = 2048;

export type DestinationValidation = { valid: true } | { valid: false; message: string };

const blockedAddresses = new BlockList();

// IPv4: this-host, private, carrier-grade NAT, loopback, link-local, documentation,
// benchmarking, multicast, and reserved ranges.
blockedAddresses.addSubnet('0.0.0.0', 8, 'ipv4');
blockedAddresses.addSubnet('10.0.0.0', 8, 'ipv4');
blockedAddresses.addSubnet('100.64.0.0', 10, 'ipv4');
blockedAddresses.addSubnet('127.0.0.0', 8, 'ipv4');
blockedAddresses.addSubnet('169.254.0.0', 16, 'ipv4');
blockedAddresses.addSubnet('172.16.0.0', 12, 'ipv4');
blockedAddresses.addSubnet('192.0.0.0', 24, 'ipv4');
blockedAddresses.addSubnet('192.0.2.0', 24, 'ipv4');
blockedAddresses.addSubnet('192.168.0.0', 16, 'ipv4');
blockedAddresses.addSubnet('198.18.0.0', 15, 'ipv4');
blockedAddresses.addSubnet('198.51.100.0', 24, 'ipv4');
blockedAddresses.addSubnet('203.0.113.0', 24, 'ipv4');
blockedAddresses.addSubnet('224.0.0.0', 4, 'ipv4');
blockedAddresses.addSubnet('240.0.0.0', 4, 'ipv4');

// IPv6: unspecified, loopback, NAT64, discard, documentation, unique-local,
// link-local, and multicast. IPv4-mapped addresses are checked against the
// IPv4 rules above by Node's BlockList implementation.
blockedAddresses.addAddress('::', 'ipv6');
blockedAddresses.addAddress('::1', 'ipv6');
blockedAddresses.addSubnet('64:ff9b::', 96, 'ipv6');
blockedAddresses.addSubnet('100::', 64, 'ipv6');
blockedAddresses.addSubnet('2001:db8::', 32, 'ipv6');
blockedAddresses.addSubnet('fc00::', 7, 'ipv6');
blockedAddresses.addSubnet('fe80::', 10, 'ipv6');
blockedAddresses.addSubnet('ff00::', 8, 'ipv6');

function normalizeHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.+$/, '');
}

function isLocalOrPrivateHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return true;
  }

  const version = isIP(hostname);

  if (version === 4) {
    return blockedAddresses.check(hostname, 'ipv4');
  }

  if (version === 6) {
    return blockedAddresses.check(hostname, 'ipv6');
  }

  return false;
}

function ownHostname(baseUrl: string): string | null {
  try {
    return normalizeHostname(new URL(baseUrl).hostname);
  } catch {
    return null;
  }
}

/**
 * Validate a link destination using the WHATWG URL parser. Accepts only
 * absolute http/https URLs, rejects credentials, the app's own host, and
 * localhost/private/loopback address literals.
 */
export function validateDestinationUrl(
  value: string,
  baseUrl: string = env.BASE_URL,
): DestinationValidation {
  if (value.length === 0) {
    return { valid: false, message: 'Destination URL is required.' };
  }

  if (value.length > MAX_DESTINATION_URL_LENGTH) {
    return {
      valid: false,
      message: `Destination URL must be at most ${MAX_DESTINATION_URL_LENGTH} characters.`,
    };
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return { valid: false, message: 'Enter a valid absolute URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, message: 'Only http:// and https:// destinations are allowed.' };
  }

  if (parsed.username !== '' || parsed.password !== '') {
    return { valid: false, message: 'Destination URL must not include credentials.' };
  }

  const hostname = normalizeHostname(parsed.hostname);
  const appHostname = ownHostname(baseUrl);

  if (appHostname !== null && hostname === appHostname) {
    return { valid: false, message: 'Destination URL must not point to this application.' };
  }

  if (isLocalOrPrivateHost(hostname)) {
    return {
      valid: false,
      message: 'Destination URL must not point to localhost or a private network address.',
    };
  }

  return { valid: true };
}

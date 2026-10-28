import * as QRCode from 'qrcode';
import { AppError } from '../errors/app-error.js';
import { buildShortUrl } from '../lib/short-url.js';
import { findLinkForUser } from '../repositories/links.repository.js';

export interface LinkQr {
  alias: string;
  svg: string;
}

/** Generate an SVG QR code for an owned link's short URL. */
export async function generateLinkQr(userId: string, linkId: string): Promise<LinkQr> {
  const link = await findLinkForUser(linkId, userId);

  if (!link) {
    throw new AppError(404, 'LINK_NOT_FOUND', 'Link not found.');
  }

  const svg = await QRCode.toString(buildShortUrl(link.alias), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });

  return { alias: link.alias, svg };
}

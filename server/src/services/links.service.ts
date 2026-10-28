import { env } from '../config/env.js';
import type { Link } from '../db/schema.js';
import { AppError } from '../errors/app-error.js';
import { generateAlias } from '../lib/alias.js';
import { isUniqueViolation } from '../lib/db-errors.js';
import { logger } from '../lib/logger.js';
import {
  countLinksByUser,
  deleteLinkForUser,
  findLinkForUser,
  findLinksByUser,
  insertLink,
  updateLinkForUser,
} from '../repositories/links.repository.js';
import type { UpdateLinkRecord } from '../repositories/links.repository.js';
import type {
  CreateLinkInput,
  ListLinksQuery,
  UpdateLinkInput,
} from '../validation/link.schema.js';

const MAX_ALIAS_ATTEMPTS = 5;

export interface LinkDto {
  id: string;
  alias: string;
  shortUrl: string;
  destinationUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkListItem extends LinkDto {
  clickCount: number;
}

export interface PaginatedLinks {
  links: LinkListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function toLinkDto(link: Link): LinkDto {
  return {
    id: link.id,
    alias: link.alias,
    shortUrl: `${env.BASE_URL.replace(/\/+$/, '')}/${link.alias}`,
    destinationUrl: link.destinationUrl,
    isActive: link.isActive,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

function aliasTakenError(): AppError {
  return new AppError(409, 'ALIAS_TAKEN', 'This alias is already in use.', {
    alias: 'Alias is already in use',
  });
}

function linkNotFoundError(): AppError {
  return new AppError(404, 'LINK_NOT_FOUND', 'Link not found.');
}

function recordFor(userId: string, alias: string, input: CreateLinkInput) {
  return {
    userId,
    alias,
    destinationUrl: input.destinationUrl,
    expiresAt: input.expiresAt ?? null,
  };
}

export async function createLink(userId: string, input: CreateLinkInput): Promise<LinkDto> {
  if (input.alias !== undefined) {
    try {
      const link = await insertLink(recordFor(userId, input.alias, input));
      return toLinkDto(link);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw aliasTakenError();
      }

      throw error;
    }
  }

  for (let attempt = 1; attempt <= MAX_ALIAS_ATTEMPTS; attempt += 1) {
    try {
      const link = await insertLink(recordFor(userId, generateAlias(), input));
      return toLinkDto(link);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      logger.warn({ attempt }, 'Generated alias collided, retrying');
    }
  }

  throw new AppError(
    500,
    'ALIAS_GENERATION_FAILED',
    'Could not generate a unique alias. Please try again.',
  );
}

export async function listLinks(userId: string, query: ListLinksQuery): Promise<PaginatedLinks> {
  const offset = (query.page - 1) * query.limit;

  const [rows, total] = await Promise.all([
    findLinksByUser(userId, query.limit, offset),
    countLinksByUser(userId),
  ]);

  return {
    links: rows.map((row) => ({ ...toLinkDto(row), clickCount: row.clickCount })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getLink(userId: string, id: string): Promise<LinkDto> {
  const link = await findLinkForUser(id, userId);

  if (!link) {
    throw linkNotFoundError();
  }

  return toLinkDto(link);
}

export async function updateLink(
  userId: string,
  id: string,
  input: UpdateLinkInput,
): Promise<LinkDto> {
  const patch: UpdateLinkRecord = { updatedAt: new Date() };

  if (input.destinationUrl !== undefined) {
    patch.destinationUrl = input.destinationUrl;
  }

  if (input.expiresAt !== undefined) {
    patch.expiresAt = input.expiresAt;
  }

  if (input.isActive !== undefined) {
    patch.isActive = input.isActive;
  }

  const link = await updateLinkForUser(id, userId, patch);

  if (!link) {
    throw linkNotFoundError();
  }

  return toLinkDto(link);
}

export async function deleteLink(userId: string, id: string): Promise<void> {
  const deleted = await deleteLinkForUser(id, userId);

  if (!deleted) {
    throw linkNotFoundError();
  }
}

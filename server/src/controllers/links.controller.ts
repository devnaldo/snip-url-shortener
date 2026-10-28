import type { Request, Response } from 'express';
import { parseInput } from '../lib/validation.js';
import { getAuthContext } from '../middleware/require-auth.js';
import * as linksService from '../services/links.service.js';
import {
  createLinkSchema,
  linkIdParamsSchema,
  listLinksQuerySchema,
  updateLinkSchema,
} from '../validation/link.schema.js';

export async function createLink(req: Request, res: Response): Promise<void> {
  const input = parseInput(createLinkSchema, req.body as unknown);
  const link = await linksService.createLink(getAuthContext(req).userId, input);

  res.status(201).json({ link });
}

export async function listLinks(req: Request, res: Response): Promise<void> {
  const query = parseInput(listLinksQuerySchema, req.query as unknown);
  const result = await linksService.listLinks(getAuthContext(req).userId, query);

  res.status(200).json(result);
}

export async function getLink(req: Request, res: Response): Promise<void> {
  const { id } = parseInput(linkIdParamsSchema, req.params as unknown);
  const link = await linksService.getLink(getAuthContext(req).userId, id);

  res.status(200).json({ link });
}

export async function updateLink(req: Request, res: Response): Promise<void> {
  const { id } = parseInput(linkIdParamsSchema, req.params as unknown);
  const input = parseInput(updateLinkSchema, req.body as unknown);
  const link = await linksService.updateLink(getAuthContext(req).userId, id, input);

  res.status(200).json({ link });
}

export async function deleteLink(req: Request, res: Response): Promise<void> {
  const { id } = parseInput(linkIdParamsSchema, req.params as unknown);
  await linksService.deleteLink(getAuthContext(req).userId, id);

  res.status(204).send();
}

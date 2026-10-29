import { apiRequest, apiRequestBlob } from './client';
import type {
  AnalyticsRange,
  CreateLinkInput,
  LinkAnalytics,
  LinkDto,
  PaginatedLinks,
  UpdateLinkInput,
} from './types';

interface LinkResponse {
  link: LinkDto;
}

export const linksApi = {
  async list(page = 1, limit = 20): Promise<PaginatedLinks> {
    return apiRequest<PaginatedLinks>(`/links?page=${page}&limit=${limit}`);
  },

  async get(id: string): Promise<LinkDto> {
    const result = await apiRequest<LinkResponse>(`/links/${encodeURIComponent(id)}`);
    return result.link;
  },

  async create(input: CreateLinkInput): Promise<LinkDto> {
    const result = await apiRequest<LinkResponse>('/links', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return result.link;
  },

  async update(id: string, input: UpdateLinkInput): Promise<LinkDto> {
    const result = await apiRequest<LinkResponse>(`/links/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });

    return result.link;
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/links/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async analytics(id: string, range: AnalyticsRange): Promise<LinkAnalytics> {
    return apiRequest<LinkAnalytics>(
      `/links/${encodeURIComponent(id)}/analytics?range=${range}`,
    );
  },

  async qr(id: string): Promise<Blob> {
    return apiRequestBlob(`/links/${encodeURIComponent(id)}/qr`);
  },
};

import { useEffect, useState } from 'react';
import { errorMessage } from '../api/client';
import { linksApi } from '../api/links';
import type { LinkDto, LinkListItem, Pagination as PaginationState } from '../api/types';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RefreshIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState } from '../components/States';
import { CreateLinkForm } from '../components/links/CreateLinkForm';
import { EditLinkModal } from '../components/links/EditLinkModal';
import { LinkCard } from '../components/links/LinkCard';
import { LinkTable } from '../components/links/LinkTable';
import { QrModal } from '../components/links/QrModal';
import { applyLinkUpdate } from '../lib/link-state';
import { useToast } from '../toast/useToast';

type ListStatus = 'loading' | 'ready' | 'error';

const EMPTY_PAGINATION: PaginationState = { page: 1, limit: 20, total: 0, totalPages: 0 };

export function DashboardPage() {
  const { showToast } = useToast();
  const [links, setLinks] = useState<LinkListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ListStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<LinkListItem | null>(null);
  const [qrLink, setQrLink] = useState<LinkListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LinkListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    linksApi
      .list(page)
      .then((result) => {
        if (cancelled) return;
        setLinks(result.links);
        setPagination(result.pagination);
        setStatus('ready');
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(errorMessage(requestError));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  function refresh() {
    setStatus('loading');
    setError(null);
    setReloadToken((token) => token + 1);
  }

  function goToPage(nextPage: number) {
    if (nextPage === page) return;
    setStatus('loading');
    setLinks([]);
    setPage(nextPage);
  }

  function handleCreated() {
    setStatus('loading');
    setLinks([]);
    setPage(1);
    setReloadToken((token) => token + 1);
  }

  async function handleToggle(link: LinkListItem) {
    setTogglingId(link.id);

    try {
      const updated = await linksApi.update(link.id, { isActive: !link.isActive });
      setLinks((current) => applyLinkUpdate(current, updated));
      showToast(updated.isActive ? 'Link enabled.' : 'Link disabled.', 'success');
    } catch (requestError) {
      showToast(errorMessage(requestError), 'error');
    } finally {
      setTogglingId(null);
    }
  }

  function handleSaved(updated: LinkDto) {
    setLinks((current) => applyLinkUpdate(current, updated));
    setEditingLink(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      await linksApi.remove(deleteTarget.id);
      showToast('Link deleted.', 'success');
      setDeleteTarget(null);

      if (links.length === 1 && page > 1) {
        setStatus('loading');
        setPage(page - 1);
      } else {
        refresh();
      }
    } catch (requestError) {
      showToast(errorMessage(requestError), 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  const isInitialLoading = status === 'loading' && links.length === 0;

  return (
    <div>
      <header className="border-b border-line pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Workspace / Links</p>
            <h1 className="mt-3 font-display text-[1.75rem] leading-none tracking-tight text-ink sm:text-[2.25rem]">
              Your links
            </h1>
            <p className="mt-3 max-w-lg text-xs leading-relaxed text-muted">
              Create, share, and measure short links. Every redirect is served from cache before the
              click is recorded.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={refresh}
            isLoading={status === 'loading'}
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        <dl className="mt-6 flex flex-wrap items-baseline gap-x-7 gap-y-2">
          <div className="flex items-baseline gap-2">
            <dt className="eyebrow">Total</dt>
            <dd className="font-terminal text-lg leading-none text-ink">{pagination.total}</dd>
          </div>
          {pagination.totalPages > 1 ? (
            <div className="flex items-baseline gap-2">
              <dt className="eyebrow">Page</dt>
              <dd className="font-terminal text-lg leading-none text-ink">
                {pagination.page} / {pagination.totalPages}
              </dd>
            </div>
          ) : null}
          <div className="flex items-baseline gap-2">
            <dt className="eyebrow">Tracking</dt>
            <dd className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted">
              Async · batched
            </dd>
          </div>
        </dl>
      </header>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:items-start xl:gap-8">
        <CreateLinkForm onCreated={handleCreated} />

        <section className="min-w-0 space-y-4" aria-labelledby="links-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="links-heading" className="eyebrow">
              All links
            </h2>
            {status === 'ready' && links.length > 0 ? (
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-subtle">
                {links.length} on this page
              </p>
            ) : null}
          </div>

          {isInitialLoading ? (
            <div className="space-y-3" role="status" aria-label="Loading links">
              {[0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="animate-skeleton rounded-lg border border-line bg-surface p-4"
                >
                  <div className="h-3.5 w-1/3 bg-surface-2" />
                  <div className="mt-3 h-2.5 w-2/3 bg-surface-2" />
                  <div className="mt-4 h-7 w-1/2 bg-surface-2" />
                </div>
              ))}
            </div>
          ) : status === 'error' ? (
            <ErrorState
              title="Could not load your links"
              message={error ?? 'Please try again.'}
              onRetry={refresh}
            />
          ) : links.length === 0 ? (
            <EmptyState
              title="No links yet"
              description="Create your first short link with the form. Once it is shared, clicks will show up here and in analytics."
            />
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 lg:hidden">
                {links.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    isToggling={togglingId === link.id}
                    onToggle={() => void handleToggle(link)}
                    onEdit={() => setEditingLink(link)}
                    onDelete={() => setDeleteTarget(link)}
                    onShowQr={() => setQrLink(link)}
                  />
                ))}
              </div>

              <LinkTable
                links={links}
                togglingId={togglingId}
                onToggle={(link) => void handleToggle(link)}
                onEdit={setEditingLink}
                onDelete={setDeleteTarget}
                onShowQr={setQrLink}
              />

              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onChange={goToPage}
                disabled={status === 'loading'}
              />
            </>
          )}
        </section>
      </div>

      {editingLink ? (
        <EditLinkModal
          key={editingLink.id}
          link={editingLink}
          onClose={() => setEditingLink(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {qrLink ? <QrModal key={qrLink.id} link={qrLink} onClose={() => setQrLink(null)} /> : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this link?"
        description={
          deleteTarget
            ? `${deleteTarget.shortUrl} will stop redirecting immediately.`
            : 'This link will stop redirecting immediately.'
        }
        confirmLabel="Delete link"
        isLoading={isDeleting}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { errorMessage } from '../api/client';
import { linksApi } from '../api/links';
import type { LinkDto, LinkListItem, Pagination as PaginationState } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/Button';
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Your links
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {status === 'ready'
              ? `${pagination.total} ${pagination.total === 1 ? 'link' : 'links'} · clicks tracked automatically.`
              : 'Create, share, and measure your short links.'}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={refresh}
          isLoading={status === 'loading'}
        >
          Refresh
        </Button>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
        <CreateLinkForm onCreated={handleCreated} />

        <section className="min-w-0 space-y-4" aria-labelledby="links-heading">
          <h2 id="links-heading" className="sr-only">
            All links
          </h2>

          {isInitialLoading ? (
            <div className="space-y-3" role="status" aria-label="Loading links">
              {[0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="animate-pulse rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
                  <div className="mt-4 h-8 w-1/2 rounded bg-slate-100" />
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
              <div className="space-y-3 md:hidden">
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

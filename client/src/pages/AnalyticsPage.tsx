import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { linksApi } from '../api/links';
import type { AnalyticsRange, LinkAnalytics, LinkDto } from '../api/types';
import { BrowserChart } from '../components/analytics/BrowserChart';
import { ClicksChart } from '../components/analytics/ClicksChart';
import { DeviceChart } from '../components/analytics/DeviceChart';
import { RangeSelector } from '../components/analytics/RangeSelector';
import { ReferrerList } from '../components/analytics/ReferrerList';
import { Button } from '../components/Button';
import { ArrowLeftIcon, CopyIcon, ExternalLinkIcon, LinkIcon } from '../components/Icons';
import { LinkStatusBadge } from '../components/links/LinkStatus';
import { ErrorState } from '../components/States';
import { copyText } from '../lib/clipboard';
import { formatNumber } from '../lib/format';
import { buttonClassName, cn } from '../lib/styles';
import { useToast } from '../toast/useToast';

type FetchStatus = 'loading' | 'ready' | 'error';

function Panel({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-line bg-surface', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="font-display text-[0.75rem] uppercase tracking-[0.06em] text-ink">
          {title}
        </h2>
        {note ? (
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-subtle">{note}</p>
        ) : null}
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="h-1.5 w-1.5 bg-accent" />
        <h3 className="eyebrow">{label}</h3>
      </div>
      <p className="mt-3 font-terminal text-[2.25rem] leading-none text-ink sm:text-[2.75rem]">
        {formatNumber(value)}
      </p>
      <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-subtle">
        {note}
      </p>
    </section>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading analytics">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[0, 1].map((key) => (
          <div key={key} className="rounded-lg border border-line bg-surface p-4 sm:p-5">
            <div className="h-2.5 w-20 animate-skeleton bg-surface-2" />
            <div className="mt-4 h-9 w-16 animate-skeleton bg-surface-2" />
            <div className="mt-3 h-2 w-24 animate-skeleton bg-surface-2" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <div className="h-2.5 w-32 animate-skeleton bg-surface-2" />
        <div className="mt-4 h-[220px] animate-skeleton bg-surface-2" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((key) => (
          <div key={key} className="rounded-lg border border-line bg-surface p-4 sm:p-5">
            <div className="h-2.5 w-28 animate-skeleton bg-surface-2" />
            <div className="mt-4 h-[150px] animate-skeleton bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [link, setLink] = useState<LinkDto | null>(null);
  const [linkStatus, setLinkStatus] = useState<FetchStatus>('loading');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkReloadToken, setLinkReloadToken] = useState(0);

  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [analyticsStatus, setAnalyticsStatus] = useState<FetchStatus>('loading');
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsReloadToken, setAnalyticsReloadToken] = useState(0);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    linksApi
      .get(id)
      .then((result) => {
        if (cancelled) return;
        setLink(result);
        setLinkStatus('ready');
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setLinkError(errorMessage(requestError));
        setLinkStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [id, linkReloadToken]);

  useEffect(() => {
    if (!id || linkStatus !== 'ready') return;

    let cancelled = false;

    linksApi
      .analytics(id, range)
      .then((result) => {
        if (cancelled) return;
        setAnalytics(result);
        setAnalyticsStatus('ready');
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setAnalyticsError(errorMessage(requestError));
        setAnalyticsStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [id, range, linkStatus, analyticsReloadToken]);

  if (!id) {
    return <Navigate to="/" replace />;
  }

  function retryLink() {
    setLinkStatus('loading');
    setLinkError(null);
    setLinkReloadToken((token) => token + 1);
  }

  function changeRange(nextRange: AnalyticsRange) {
    if (nextRange === range) return;
    setAnalyticsStatus('loading');
    setAnalyticsError(null);
    setRange(nextRange);
  }

  function retryAnalytics() {
    setAnalyticsStatus('loading');
    setAnalyticsError(null);
    setAnalyticsReloadToken((token) => token + 1);
  }

  async function handleCopy() {
    if (!link) return;
    const copied = await copyText(link.shortUrl);
    showToast(
      copied ? 'Short link copied to clipboard.' : 'Could not copy the link. Try again.',
      copied ? 'success' : 'error',
    );
  }

  const backLink = (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted transition-colors duration-150 hover:text-ink"
    >
      <ArrowLeftIcon className="h-3.5 w-3.5" />
      Back to links
    </Link>
  );

  if (linkStatus === 'loading') {
    return (
      <div role="status" aria-label="Loading link analytics" className="space-y-6">
        <div className="h-3 w-28 animate-skeleton bg-surface-2" />
        <div className="space-y-3">
          <div className="h-8 w-56 animate-skeleton bg-surface-2" />
          <div className="h-2.5 w-72 max-w-full animate-skeleton bg-surface-2" />
        </div>
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (linkStatus === 'error' || !link) {
    return (
      <div className="space-y-4">
        {backLink}
        <ErrorState
          title="Could not load this link"
          message={linkError ?? 'The link may have been deleted.'}
          onRetry={retryLink}
        />
      </div>
    );
  }

  return (
    <div>
      {backLink}

      <div className="mt-5 flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="break-all font-display text-[1.5rem] leading-tight tracking-tight text-ink sm:text-[2rem]">
              {link.alias}
            </h1>
            <LinkStatusBadge link={link} />
          </div>

          <p className="mt-2 break-all text-xs leading-relaxed text-subtle">
            {link.destinationUrl}
          </p>

          <button
            type="button"
            onClick={() => void handleCopy()}
            className="mt-3 inline-flex max-w-full items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-[0.6875rem] text-ink transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
          >
            <LinkIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="truncate">{link.shortUrl}</span>
            <CopyIcon className="h-3.5 w-3.5 shrink-0 text-subtle" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void handleCopy()}>
            <CopyIcon className="h-3.5 w-3.5" />
            Copy link
          </Button>
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonClassName('secondary', 'sm')}
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
            Open link
          </a>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-[0.875rem] uppercase tracking-[0.06em] text-ink">
            Performance
          </h2>
          <p className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-subtle">
            UTC days · gap-filled with zeros
          </p>
        </div>
        <RangeSelector value={range} onChange={changeRange} />
      </div>

      <div className="mt-4">
        {analyticsStatus === 'loading' ? (
          <AnalyticsSkeleton />
        ) : analyticsStatus === 'error' || !analytics ? (
          <ErrorState
            title="Could not load analytics"
            message={analyticsError ?? 'Please try again.'}
            onRetry={retryAnalytics}
          />
        ) : (
          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <MetricCard
                label="Total clicks"
                value={analytics.totals.totalClicks}
                note="In the selected range"
              />
              <MetricCard
                label="Unique visitors"
                value={analytics.totals.uniqueVisitors}
                note="Daily-rotating hashes"
              />
            </div>

            {analytics.totals.totalClicks === 0 ? (
              <div className="flex items-start gap-2.5 rounded-md border border-line bg-accent-soft px-4 py-3 text-xs leading-relaxed text-ink">
                <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 bg-accent" />
                <p>
                  No clicks recorded in this range yet. Share the short link to start collecting
                  analytics.
                </p>
              </div>
            ) : null}

            <Panel title="Clicks over time" note="Daily totals">
              <ClicksChart data={analytics.clicksOverTime} />
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Top referrers" note="Up to 10">
                <ReferrerList data={analytics.topReferrers} />
              </Panel>

              <Panel title="Devices" note="Share of clicks">
                <DeviceChart data={analytics.deviceSplit} />
              </Panel>
            </div>

            <Panel title="Browsers" note="Clicks by browser">
              <BrowserChart data={analytics.browserSplit} />
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

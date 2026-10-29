import { useEffect, useState } from 'react';
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
import { ErrorState } from '../components/States';
import { LinkStatusBadge } from '../components/links/LinkStatus';
import { copyText } from '../lib/clipboard';
import { formatNumber } from '../lib/format';
import { cardClassName } from '../lib/styles';
import { useToast } from '../toast/useToast';

type FetchStatus = 'loading' | 'ready' | 'error';

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading analytics">
      <div className="grid animate-pulse grid-cols-2 gap-3 sm:gap-4">
        {[0, 1].map((key) => (
          <div key={key} className={cardClassName}>
            <div className="p-4 sm:p-5">
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="mt-3 h-8 w-16 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
      <div className={`${cardClassName} animate-pulse p-4 sm:p-5`}>
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-4 h-[220px] rounded bg-slate-100" />
      </div>
      <div className="grid animate-pulse gap-4 lg:grid-cols-2">
        {[0, 1].map((key) => (
          <div key={key} className={`${cardClassName} p-4 sm:p-5`}>
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="mt-4 h-[160px] rounded bg-slate-100" />
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

  if (linkStatus === 'loading') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
        Loading link analytics…
      </div>
    );
  }

  if (linkStatus === 'error' || !link) {
    return (
      <div className="space-y-4">
        <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Back to links
        </Link>
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
      <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
        ← Back to links
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {link.alias}
            </h1>
            <LinkStatusBadge link={link} />
          </div>
          <p className="mt-1 break-all text-sm text-slate-600">{link.destinationUrl}</p>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            {link.shortUrl}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void handleCopy()}>
            Copy link
          </Button>
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Open link
          </a>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">Performance</h2>
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
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <section className={`${cardClassName} p-4 sm:p-5`}>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total clicks
                </h3>
                <p className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                  {formatNumber(analytics.totals.totalClicks)}
                </p>
                <p className="mt-1 text-xs text-slate-500">In the selected range</p>
              </section>
              <section className={`${cardClassName} p-4 sm:p-5`}>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Unique visitors
                </h3>
                <p className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                  {formatNumber(analytics.totals.uniqueVisitors)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Daily-rotating visitor hashes</p>
              </section>
            </div>

            {analytics.totals.totalClicks === 0 ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                No clicks recorded in this range yet. Share the short link to start collecting
                analytics.
              </div>
            ) : null}

            <section className={`${cardClassName} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">Clicks over time</h2>
                <p className="text-xs text-slate-500">UTC days, gap-filled with zeros</p>
              </div>
              <div className="mt-3">
                <ClicksChart data={analytics.clicksOverTime} />
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className={`${cardClassName} p-4 sm:p-5`}>
                <h2 className="text-base font-semibold text-slate-900">Top referrers</h2>
                <p className="mt-0.5 text-xs text-slate-500">Up to 10 sources, Direct included</p>
                <div className="mt-3">
                  <ReferrerList data={analytics.topReferrers} />
                </div>
              </section>

              <section className={`${cardClassName} p-4 sm:p-5`}>
                <h2 className="text-base font-semibold text-slate-900">Devices</h2>
                <p className="mt-0.5 text-xs text-slate-500">Share of clicks by device type</p>
                <div className="mt-3">
                  <DeviceChart data={analytics.deviceSplit} />
                </div>
              </section>
            </div>

            <section className={`${cardClassName} p-4 sm:p-5`}>
              <h2 className="text-base font-semibold text-slate-900">Browsers</h2>
              <p className="mt-0.5 text-xs text-slate-500">Clicks by browser</p>
              <div className="mt-3">
                <BrowserChart data={analytics.browserSplit} />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { errorMessage } from '../../api/client';
import { linksApi } from '../../api/links';
import type { LinkDto } from '../../api/types';
import { buttonClassName } from '../../lib/styles';
import { Button } from '../Button';
import { DownloadIcon } from '../Icons';
import { Modal } from '../Modal';
import { Spinner } from '../Spinner';

interface QrModalProps {
  link: LinkDto;
  onClose: () => void;
}

type QrStatus = 'loading' | 'ready' | 'error';

export function QrModal({ link, onClose }: QrModalProps) {
  const [status, setStatus] = useState<QrStatus>('loading');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    linksApi
      .qr(link.id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setStatus('ready');
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(errorMessage(requestError));
        setStatus('error');
      });

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [link.id, reloadToken]);

  function retry() {
    setStatus('loading');
    setError(null);
    setImageUrl(null);
    setReloadToken((token) => token + 1);
  }

  const filename = `snip-${link.alias}.svg`;

  return (
    <Modal
      open
      onClose={onClose}
      title="QR code"
      description={`Scan or download a QR code for ${link.alias}.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          {status === 'ready' && imageUrl ? (
            <a href={imageUrl} download={filename} className={buttonClassName('primary', 'sm')}>
              <DownloadIcon className="h-3.5 w-3.5" />
              Download SVG
            </a>
          ) : null}
        </>
      }
    >
      <div className="flex min-h-[248px] flex-col items-center justify-center gap-4">
        {status === 'loading' ? (
          <div className="flex flex-col items-center gap-3" role="status">
            <Spinner className="h-4 w-4 text-accent" />
            <p className="eyebrow">Generating QR code</p>
          </div>
        ) : status === 'error' ? (
          <div role="alert" className="text-center">
            <p className="font-display text-[0.75rem] uppercase tracking-[0.06em] text-ink">
              Could not generate the QR code
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{error}</p>
            <Button variant="secondary" size="sm" className="mt-5" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : imageUrl ? (
          <>
            <div className="w-full max-w-[240px] rounded-md border border-line bg-white p-3">
              <img
                src={imageUrl}
                alt={`QR code for ${link.shortUrl}`}
                className="mx-auto block h-auto w-full"
              />
            </div>
            <p className="break-all text-center font-mono text-[0.6875rem] text-subtle">
              {link.shortUrl}
            </p>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

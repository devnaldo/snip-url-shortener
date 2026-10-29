import { useEffect, useState } from 'react';
import { errorMessage } from '../../api/client';
import { linksApi } from '../../api/links';
import type { LinkDto } from '../../api/types';
import { buttonClassName } from '../../lib/styles';
import { Button } from '../Button';
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
              Download SVG
            </a>
          ) : null}
        </>
      }
    >
      <div className="flex min-h-[248px] flex-col items-center justify-center gap-3">
        {status === 'loading' ? (
          <>
            <Spinner className="h-7 w-7 text-indigo-600" />
            <p className="text-sm text-slate-600" role="status">
              Generating QR code…
            </p>
          </>
        ) : status === 'error' ? (
          <div role="alert" className="text-center">
            <p className="text-sm font-medium text-slate-900">Could not generate the QR code</p>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : imageUrl ? (
          <>
            <div className="w-full max-w-[260px] rounded-xl border border-slate-200 bg-white p-3">
              <img
                src={imageUrl}
                alt={`QR code for ${link.shortUrl}`}
                className="mx-auto block h-auto w-full"
              />
            </div>
            <p className="break-all text-center text-xs text-slate-500">{link.shortUrl}</p>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

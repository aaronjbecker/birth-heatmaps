/**
 * Share buttons for the Compare Countries page.
 * React component that dynamically updates with the current URL state.
 */
import React, { useState, useCallback } from 'react';
import {
  copyToClipboard,
  getTwitterShareUrl,
  getFacebookShareUrl,
  getLinkedInShareUrl,
  getRedditShareUrl,
} from '../lib/url-params';

export interface CompareShareButtonsProps {
  url: string;
  title?: string;
  description?: string;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  label: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    marginRight: '4px',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '6px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    backgroundColor: 'var(--color-bg-alt)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  buttonSuccess: {
    backgroundColor: 'var(--color-success, #10b981)',
    borderColor: 'var(--color-success, #10b981)',
    color: 'white',
  },
  icon: {
    width: '14px',
    height: '14px',
  },
};

const buttonStyles = `
  .share-button:hover {
    border-color: var(--color-primary);
    background-color: var(--color-bg);
  }
  .share-button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`;

export function CompareShareButtons({
  url,
  title = 'Compare Countries - Birth Heatmaps',
  description = 'Compare birth patterns across multiple countries',
}: CompareShareButtonsProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  const shareText = `${title} - ${description}`;

  return (
    <div style={styles.container} data-testid="compare-share-buttons">
      <style>{buttonStyles}</style>
      <span style={styles.label}>Share:</span>

      {/* Copy Link */}
      <button
        type="button"
        className="share-button"
        style={{
          ...styles.button,
          ...(copied ? styles.buttonSuccess : {}),
        }}
        onClick={handleCopyLink}
        aria-label="Copy link to clipboard"
        data-testid="copy-link-button"
      >
        {copied ? (
          <>
            <svg style={styles.icon} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg style={styles.icon} viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
            Copy Link
          </>
        )}
      </button>

      {/* Twitter/X */}
      <a
        href={getTwitterShareUrl(url, shareText)}
        target="_blank"
        rel="noopener noreferrer"
        className="share-button"
        style={styles.button}
        aria-label="Share on X (Twitter)"
      >
        <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X
      </a>

      {/* Facebook */}
      <a
        href={getFacebookShareUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="share-button"
        style={styles.button}
        aria-label="Share on Facebook"
      >
        <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Facebook
      </a>

      {/* LinkedIn */}
      <a
        href={getLinkedInShareUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="share-button"
        style={styles.button}
        aria-label="Share on LinkedIn"
      >
        <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        LinkedIn
      </a>

      {/* Reddit */}
      <a
        href={getRedditShareUrl(url, title)}
        target="_blank"
        rel="noopener noreferrer"
        className="share-button"
        style={styles.button}
        aria-label="Share on Reddit"
      >
        <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
        Reddit
      </a>
    </div>
  );
}

export default CompareShareButtons;

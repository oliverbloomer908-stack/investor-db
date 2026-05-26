'use client';

import { Investor } from '@/types';

interface InvestorDetailProps {
  investor: Investor | null;
  onClose: () => void;
}

export default function InvestorDetail({ investor, onClose }: InvestorDetailProps) {
  if (!investor) return null;

  const isOpen = true;

  function openLinkedIn(url: string) {
    window.open(url, '_blank');
  }

  return (
    <>
      <div className={`detail-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`detail-panel ${isOpen ? 'open' : ''}`}>
        {investor && (
          <div className="detail-panel-inner">
            <button className="detail-close" onClick={onClose} aria-label="Close">&times;</button>

            <div className="detail-field">
              <label>Full Name</label>
              <span>{investor.firstName} {investor.lastName}</span>
            </div>

            <div className="detail-field">
              <label>LinkedIn</label>
              <span>
                <button
                  onClick={() => openLinkedIn(investor.linkedInUrl)}
                  style={{ padding: '4px 12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Open LinkedIn
                </button>
              </span>
            </div>

            <div className="detail-field">
              <label>Title</label>
              <span>{investor.title || '—'}</span>
            </div>

            <div className="detail-field">
              <label>Company</label>
              <span>{investor.companyName || '—'}</span>
            </div>

            <div className="detail-field">
              <label>Location</label>
              <span>{investor.location || '—'}</span>
            </div>

            <div className="detail-field">
              <label>Seniority</label>
              <span>{investor.seniority || '—'}</span>
            </div>

            <div className="detail-field">
              <label>Industries</label>
              <span>{investor.industries || '—'}</span>
            </div>

            <div className="detail-field">
              <label>Email</label>
              <span>{investor.email || '—'}</span>
            </div>

            <div className="detail-field">
              <label>Domain</label>
              <span>{investor.domain || '—'}</span>
            </div>

            <div className="detail-field">
              <label>Description</label>
              <span>{investor.description || '—'}</span>
            </div>

            <div className="detail-field">
              <label>Company Description</label>
              <span>{investor.companyDescription || '—'}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
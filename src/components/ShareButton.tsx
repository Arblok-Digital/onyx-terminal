import React, { useState, useRef, useEffect } from 'react';
import { Share2, Twitter, Send, Copy } from 'lucide-react';
import { bus } from '@/core/event-bus';

interface ShareButtonProps {
  text: string;
  url: string;
}

/**
 * @component ShareButton
 * @desc Floating share button with a dropdown menu for X, Telegram, and Clipboard.
 */
export default function ShareButton({ text, url }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle auto-close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fullContent = `${text}\n${url}`;

  const shareToX = () => {
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullContent)}`;
    window.open(xUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const shareToTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullContent);
      bus.emit('notify', { kind: 'success', message: 'Copied to clipboard!' });
    } catch (err) {
      bus.emit('notify', { kind: 'error', message: 'Failed to copy to clipboard' });
    }
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          background: 'rgba(59, 130, 246, 0.1)', // Biru transparan
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: isOpen ? '#fff' : '#3b82f6', // Warna biru biar kontras
          cursor: 'pointer',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          transition: 'all 0.2s',
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.2)',
        }}
        title="Share social"
      >
        <Share2 size={14} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '6px',
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: '6px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)',
            zIndex: 10000,
            minWidth: '180px',
            padding: '4px',
          }}
        >
          <button onClick={shareToX} style={optionStyle} onMouseEnter={hHover} onMouseLeave={hLeave}>
            <Twitter size={12} /> <span>Share to X</span>
          </button>
          <button onClick={shareToTelegram} style={optionStyle} onMouseEnter={hHover} onMouseLeave={hLeave}>
            <Send size={12} /> <span>Share to Telegram</span>
          </button>
          <button onClick={copyToClipboard} style={optionStyle} onMouseEnter={hHover} onMouseLeave={hLeave}>
            <Copy size={12} /> <span>Copy to Clipboard</span>
          </button>
        </div>
      )}
    </div>
  );
}

const optionStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: 'none', border: 'none',
  color: '#9ca3af', fontSize: '11px', fontWeight: 500, display: 'flex',
  alignItems: 'center', gap: '10px', cursor: 'pointer', textAlign: 'left',
  borderRadius: '4px', transition: 'all 0.1s'
};

const hHover = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; };
const hLeave = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af'; };
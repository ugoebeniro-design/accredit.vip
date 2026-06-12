'use client';

import { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { FastAverageColor } from 'fast-average-color';

interface QRPreviewProps {
  qrValue: string;
  imageUrl: string;
  title?: string;
}

export function QRPreview({ qrValue, imageUrl, title }: QRPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const qrInstanceRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!qrValue || !imageUrl) {
      setLoading(false);
      return;
    }

    const generateQR = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get dominant color from image
        const fac = new FastAverageColor();
        const color = await fac.getColorAsync(imageUrl);
        const dominantColor = color.hex;

        // Create QR code
        const qrCode = new QRCodeStyling({
          width: 300,
          height: 300,
          data: qrValue,
          image: imageUrl,
          dotsOptions: {
            color: dominantColor,
            type: 'rounded',
          },
          cornersSquareOptions: {
            color: dominantColor,
            type: 'extra-rounded',
          },
          cornersDotOptions: {
            color: dominantColor,
            type: 'square',
          },
          backgroundOptions: {
            color: '#ffffff',
          },
          imageOptions: {
            crossOrigin: 'anonymous',
            margin: 10,
            imageSize: 80,
          },
        });

        qrInstanceRef.current = qrCode;

        // Clear previous QR and render new one
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          qrCode.append(containerRef.current);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error generating QR code:', err);
        setError('Failed to generate QR code');
        setLoading(false);
      }
    };

    generateQR();
  }, [qrValue, imageUrl]);

  return (
    <div className="flex flex-col items-center gap-4">
      {title && <p className="text-sm font-semibold text-[#0D1B2A]">{title}</p>}

      <div className="flex items-center justify-center p-4 bg-white rounded-xl border border-[#e8edf2]">
        {loading && (
          <div className="w-[300px] h-[300px] flex items-center justify-center text-[#94a3b8]">
            Generating QR...
          </div>
        )}

        {error && (
          <div className="w-[300px] h-[300px] flex items-center justify-center text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div ref={containerRef} />
        )}
      </div>
    </div>
  );
}

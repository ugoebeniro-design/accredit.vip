'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const PHRASES = [
  'Create Your Own Event',
  'Send Branded Invites',
  'Generate QR Codes',
  'Track Attendance',
];

export function InviteMotionBanner() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const currentPhrase = PHRASES[phraseIndex];
    const typingSpeed = isDeleting ? 50 : 100;
    const delayBeforeDelete = 2000;
    const delayBeforeNextPhrase = 500;

    let timeout: NodeJS.Timeout;

    if (!isDeleting && charIndex < currentPhrase.length) {
      // Typing forward
      timeout = setTimeout(() => {
        setDisplayText(currentPhrase.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, typingSpeed);
    } else if (isDeleting && charIndex > 0) {
      // Deleting backward
      timeout = setTimeout(() => {
        setDisplayText(currentPhrase.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      }, typingSpeed);
    } else if (!isDeleting && charIndex === currentPhrase.length) {
      // Pause before deleting
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, delayBeforeDelete);
    } else if (isDeleting && charIndex === 0) {
      // Move to next phrase
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
      timeout = setTimeout(() => {
        setCharIndex(0);
      }, delayBeforeNextPhrase);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex]);

  return (
    <div className="w-full bg-gradient-to-r from-[#0D1B2A] via-[#1a2a3a] to-[#0D1B2A] py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Animated Text Section */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-sm font-semibold text-white/60 mb-2 uppercase tracking-wider">
              Join Accredit.vip
            </h3>
            <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#E91E8C] to-[#ff6db3] min-h-[40px] sm:min-h-[50px]">
              {displayText}
              <span className="animate-pulse">_</span>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            href="/create-event"
            className="flex-shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E91E8C] to-[#C4166F] text-white font-bold text-sm sm:text-base hover:shadow-lg hover:shadow-[#E91E8C]/50 transition-all hover:scale-105 whitespace-nowrap"
          >
            Create Event →
          </Link>
        </div>

        {/* Animated Dots Indicator */}
        <div className="flex justify-center gap-1.5 mt-4 sm:mt-6">
          {PHRASES.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === phraseIndex
                  ? 'w-8 bg-[#E91E8C]'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Focus Tracker',
    short_name: 'Focus',
    description:
      'A productivity focus timer that resets to zero if you touch your phone. Built with Next.js, Ionic, and Capacitor.',
    start_url: '/',
    display: 'standalone',
    background_color: '#7DD3FC',
    theme_color: '#0EA5E9',
    icons: [
      { src: '/icons/icon-48.webp', sizes: '48x48', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-72.webp', sizes: '72x72', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-96.webp', sizes: '96x96', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-128.webp', sizes: '128x128', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-192.webp', sizes: '192x192', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-256.webp', sizes: '256x256', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-512.webp', sizes: '512x512', type: 'image/webp', purpose: 'maskable' },
    ],
  };
}

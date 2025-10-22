import './globals.css';

export const metadata = {
  title: {
    default: 'Annota – Digital Pathology Annotation Framework',
    template: '%s | Annota',
  },
  description:
    'A high-performance annotation framework for whole slide imaging and digital pathology applications.',
  keywords: [
    'Annota',
    'Digital Pathology',
    'Whole Slide Imaging',
    'WSI',
    'Annotations',
    'OpenSeadragon',
    'React',
    'TypeScript',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

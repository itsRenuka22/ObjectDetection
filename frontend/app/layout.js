import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Traffic Object Detection',
  description: 'Real-time object detection using YOLOv8 and RT-DETR models',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

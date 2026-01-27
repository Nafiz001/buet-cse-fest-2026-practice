import './globals.css';

export const metadata = {
  title: 'CityCare Admin',
  description: 'Emergency Service Management Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

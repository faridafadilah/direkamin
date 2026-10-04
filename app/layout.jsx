import './globals.css';
export const metadata = { title: 'Direkamin', description: 'Ngantuk boleh, materi jangan lewat.' };
export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <div className="lamp" aria-hidden />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}

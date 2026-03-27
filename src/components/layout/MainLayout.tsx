import { PropsWithChildren } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <Header />
      <main className="page-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}

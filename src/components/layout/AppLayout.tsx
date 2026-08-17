import { ReactNode } from "react";
import TopBar from "./TopBar";
import AgentStatusRibbon from "./AgentStatusRibbon";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  return (
    <>
      <TopBar title={title} subtitle={subtitle} />
      <AgentStatusRibbon />
      <main className="flex-1 overflow-auto p-6 bg-background">
        {children}
      </main>
    </>
  );
}

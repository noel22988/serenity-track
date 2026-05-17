import { TabBar } from "@/components/tab-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pb-28">{children}</main>
      <TabBar />
    </>
  );
}

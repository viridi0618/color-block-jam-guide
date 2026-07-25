import { PersistentOnlineGame } from "@/components/PersistentOnlineGame";

export default function LevelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <div className="shell">
        <PersistentOnlineGame />
      </div>
    </>
  );
}
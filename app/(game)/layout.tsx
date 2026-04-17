import { auth } from '../../server/auth/auth';
import { GameSidebar } from '../../components/layout/GameSidebar';

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex bg-gray-950 min-h-screen text-gray-100 font-sans" data-user-id={session?.user?.id}>
      <GameSidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}

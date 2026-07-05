import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <main className="flex-1 flex flex-col justify-start relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 filter blur-[150px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 filter blur-[180px] animate-pulse-slow pointer-events-none" />

      <Dashboard />
    </main>
  );
}

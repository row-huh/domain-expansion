import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex gap-8">
        <Link href="/gojo" className="rounded-lg bg-purple-600 px-8 py-4 text-xl font-bold text-white hover:bg-purple-700">
          Gojo
        </Link>
        
        <Link href="/sukuna" className="rounded-lg bg-red-700 px-8 py-4 text-xl font-bold text-white hover:bg-red-800">
           Sukuna
        </Link>
      </div>
    </div>
  );
} 
import ChatWidget from '../components/ChatWidget';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">Welcome to Our Store</h1>
        <p className="text-lg text-gray-700 mb-8">
          Browse our collection and find exactly what you're looking for.
        </p>
      </div>
      <ChatWidget />
    </main>
  );
}
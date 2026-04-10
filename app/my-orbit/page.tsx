import { ProfileSettingsPanel } from "@/components/my-orbit/ProfileSettingsPanel";

export default function MyOrbitPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <ProfileSettingsPanel />
      </div>
    </main>
  );
}

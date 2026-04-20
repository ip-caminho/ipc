export default function GuidedPrayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden isolate"
      style={{
        backgroundColor: "#fafaf5",
        overscrollBehavior: "none",
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}

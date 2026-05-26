import { UserMenu } from "./UserMenu";

interface HeaderLayoutProps {
  children: React.ReactNode;
  showUserMenu?: boolean;
}

export function HeaderLayout({
  children,
  showUserMenu = true,
}: HeaderLayoutProps) {
  return (
    <div className="relative">
      {showUserMenu && (
        <div className="hidden md:block absolute top-4 right-4 z-10">
          <UserMenu />
        </div>
      )}
      {children}
    </div>
  );
}

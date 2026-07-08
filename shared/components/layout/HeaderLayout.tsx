interface HeaderLayoutProps {
  children: React.ReactNode;
  // Mantido por compatibilidade com chamadas existentes; o menu do usuario
  // (perfil, inscricoes, tema, sair) agora vive no rodape da AppSidebar no
  // desktop e no MoreSheet no mobile — nao ha mais avatar no canto superior.
  showUserMenu?: boolean;
}

export function HeaderLayout({ children }: HeaderLayoutProps) {
  return <div className="relative">{children}</div>;
}

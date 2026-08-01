import Link from "next/link";

type LegalPageHeaderProps = {
  title: string;
  updatedAt: string;
};

export default function LegalPageHeader({ title, updatedAt }: LegalPageHeaderProps) {
  return (
    <>
      <a className="legal-skip-link" href="#conteudo">Ir para o conteúdo</a>
      <header className="legal-header">
        <div className="legal-nav-shell">
          <nav className="legal-nav" aria-label="Navegação principal">
            <Link className="legal-brand" href="/" aria-label="Página inicial do TITAN NFS-e">
              <img src="/titan-nfse-logo-transparent.png" alt="TITAN NFS-e" />
            </Link>
            <Link className="legal-home-button" href="/">Voltar ao TITAN</Link>
          </nav>
        </div>
        <div className="legal-head">
          <div className="legal-in">
            <p className="legal-eyebrow">Documentos legais</p>
            <h1>{title}</h1>
            <p className="legal-updated">Última atualização: {updatedAt}</p>
          </div>
        </div>
      </header>
    </>
  );
}

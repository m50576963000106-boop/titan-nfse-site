import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ tenant?: string[] }>;
  searchParams: Promise<{ invite?: string | string[]; first?: string | string[]; token?: string | string[] }>;
};

export default async function TenantPortal({ params, searchParams }: Props) {
  const { tenant = [] } = await params;
  const query = await searchParams;
  const target = tenant[0] ?? "";
  if (tenant.length === 0) {
    return (
      <main className="prototype-shell">
        <iframe className="prototype-frame" src="/nfs.html" title="TITAN NFS-e" />
      </main>
    );
  }
  const isAdmin = tenant.length === 1 && ["admin", "adm"].includes(target.toLowerCase());
  const isClientLogin = tenant.length === 1 && target.toLowerCase() === "entrar";
  const isHelp = tenant.length === 1 && target.toLowerCase() === "martyn_ia";
  const isFirstAccess = tenant.length === 1 && ["primeiro-acesso", "primeiroacesso"].includes(target.toLowerCase());
  const isPasswordReset = tenant.length === 1 && ["redefinir-senha", "redefinirsenha"].includes(target.toLowerCase());
  const isDashboard = tenant.length === 1 && target.toLowerCase() === "dashboard";
  if (!isAdmin && !isClientLogin && !isHelp && !isFirstAccess && !isPasswordReset && !isDashboard) notFound();

  if (isClientLogin) {
    return (
      <main className="prototype-shell">
        <iframe className="prototype-frame" src="/nfs.html?login=client" title="TITAN NFS-e — Acesso" />
      </main>
    );
  }

  const frameQuery = new URLSearchParams({
    portal: isAdmin ? "admin" : isHelp ? "help" : isFirstAccess ? "first" : isPasswordReset ? "reset" : "client",
  });
  const invite = Array.isArray(query.invite) ? query.invite[0] : query.invite;
  if (invite) frameQuery.set("invite", invite);
  const token = Array.isArray(query.token) ? query.token[0] : query.token;
  if (token) frameQuery.set("token", token);

  return (
    <main className="prototype-shell">
      <iframe
        className="prototype-frame"
        src={`/titan.html?${frameQuery.toString()}`}
        title={
          isAdmin
            ? "TITAN Backoffice — Administração"
            : isHelp
              ? "TITAN NFS-e — Central de ajuda Martyn"
            : isFirstAccess
              ? "TITAN NFS-e — Primeiro acesso"
            : isPasswordReset
              ? "TITAN NFS-e — Redefinir senha"
              : "TITAN NFS-e — Painel do cliente"
        }
      />
    </main>
  );
}

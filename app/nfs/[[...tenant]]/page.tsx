import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ tenant?: string[] }>;
  searchParams: Promise<{ invite?: string | string[] }>;
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
  const isCompany = tenant.length === 1 && /^\d{14}$/.test(target);
  if (!isAdmin && !isClientLogin && !isCompany) notFound();

  const frameQuery = new URLSearchParams(
    isAdmin ? { portal: "admin" } : isCompany ? { tenant: target } : { portal: "client" },
  );
  const invite = Array.isArray(query.invite) ? query.invite[0] : query.invite;
  if (invite) frameQuery.set("invite", invite);

  return (
    <main className="prototype-shell">
      <iframe
        className="prototype-frame"
        src={`/titan.html?${frameQuery.toString()}`}
        title={
          isAdmin
            ? "TITAN Backoffice — Administração"
            : isCompany
              ? `TITAN NFS-e — CNPJ ${target}`
              : "TITAN NFS-e — Acesso do cliente"
        }
      />
    </main>
  );
}

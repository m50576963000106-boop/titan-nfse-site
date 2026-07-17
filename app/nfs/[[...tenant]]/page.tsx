import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ tenant?: string[] }>;
  searchParams: Promise<{ invite?: string | string[] }>;
};

export default async function TenantPortal({ params, searchParams }: Props) {
  const { tenant = [] } = await params;
  const query = await searchParams;
  const target = tenant[0] ?? "";
  const isAdmin = tenant.length === 1 && target.toLowerCase() === "adm";
  const isCompany = tenant.length === 1 && /^\d{14}$/.test(target);
  if (!isAdmin && !isCompany) notFound();

  const frameQuery = new URLSearchParams(isAdmin ? { portal: "adm" } : { tenant: target });
  const invite = Array.isArray(query.invite) ? query.invite[0] : query.invite;
  if (invite) frameQuery.set("invite", invite);

  return (
    <main className="prototype-shell">
      <iframe
        className="prototype-frame"
        src={`/titan.html?${frameQuery.toString()}`}
        title={isAdmin ? "TITAN Backoffice — Administração" : `TITAN NFS-e — CNPJ ${target}`}
      />
    </main>
  );
}

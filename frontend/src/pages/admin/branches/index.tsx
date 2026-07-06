import { BranchManager } from "../../../components/branches/branch-manager";
import { PageHeader } from "../../../components/ui/page-header";

export function AdminBranches() {
  return (
    <section className="screen">
      <PageHeader
        eyebrow="Logistica"
        title="Cadastro de filiais"
        description="Gerencie as lojas usadas como base de retirada, entrega e calculo por raio."
      />
      <BranchManager />
    </section>
  );
}

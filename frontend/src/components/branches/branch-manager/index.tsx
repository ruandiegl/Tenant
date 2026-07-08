import "./styles.css";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { useTenant } from "../../../app/providers/tenant-provider";
import { useBodyScrollLock } from "../../../hooks/use-body-scroll-lock";
import { branchesService, BranchPayload } from "../../../services/branches";
import { Branch } from "../../../types/database";
import { formatCep, formatPhone, onlyDigits } from "../../../utils/input-masks";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { StatusBadge } from "../../ui/status-badge";

type BranchForm = {
  name: string;
  slug: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE" | "CLOSED_TEMPORARILY";
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  acceptsDineIn: boolean;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  reference: string;
};

const emptyBranchForm: BranchForm = {
  name: "",
  slug: "",
  email: "",
  phone: "",
  status: "ACTIVE",
  acceptsDelivery: true,
  acceptsPickup: true,
  acceptsDineIn: false,
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  reference: ""
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCoordinate(value: string) {
  const normalized = value.replace(",", ".").trim();
  return normalized ? Number(normalized) : undefined;
}

export function BranchManager() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const { data: branches = [] } = useQuery({ queryKey: ["branches", tenant.id], queryFn: branchesService.list });
  const [branchForm, setBranchForm] = useState<BranchForm>(emptyBranchForm);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchPendingDelete, setBranchPendingDelete] = useState<Branch | null>(null);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);
  const [cepLookupError, setCepLookupError] = useState<string | null>(null);
  const lastCepLookupRef = useRef("");
  useBodyScrollLock(Boolean(editingBranch));

  const saveBranchMutation = useMutation({
    mutationFn: (payload: BranchPayload) =>
      editingBranch ? branchesService.update(editingBranch.id, payload) : branchesService.create(payload),
    onSuccess: async (branch) => {
      queryClient.setQueryData<Branch[]>(["branches", tenant.id], (current = []) => {
        const exists = current.some((item) => item.id === branch.id);
        return exists ? current.map((item) => (item.id === branch.id ? branch : item)) : [branch, ...current];
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["branches", tenant.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-bundle", tenant.id] })
      ]);
      lastCepLookupRef.current = "";
      setBranchForm(emptyBranchForm);
      setEditingBranch(null);
      toast.success(editingBranch ? "Filial atualizada." : "Filial criada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a filial.")
  });
  const deleteBranchMutation = useMutation({
    mutationFn: (branchId: string) => branchesService.remove(branchId),
    onSuccess: async () => {
      const removedBranchId = branchPendingDelete?.id;
      queryClient.setQueryData<Branch[]>(["branches", tenant.id], (current = []) => current.filter((branch) => branch.id !== removedBranchId));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["branches", tenant.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-bundle", tenant.id] })
      ]);
      setBranchPendingDelete(null);
      toast.success("Filial removida.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel remover a filial.")
  });

  useEffect(() => {
    const cep = onlyDigits(branchForm.postalCode);

    if (cep.length < 8) {
      setCepLookupError(null);
      setIsLookingUpCep(false);
      return;
    }

    if (lastCepLookupRef.current === cep) return;

    lastCepLookupRef.current = cep;
    const controller = new AbortController();
    setIsLookingUpCep(true);
    setCepLookupError(null);

    fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("CEP indisponivel");
        return response.json() as Promise<{
          erro?: boolean;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
        }>;
      })
      .then((data) => {
        if (data.erro) {
          setCepLookupError("CEP nao encontrado.");
          return;
        }

        setBranchForm((current) => ({
          ...current,
          street: data.logradouro || current.street,
          district: data.bairro || current.district,
          city: data.localidade || current.city,
          state: data.uf || current.state
        }));
      })
      .catch((lookupError) => {
        if ((lookupError as Error).name !== "AbortError") {
          setCepLookupError("Nao foi possivel buscar o CEP.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLookingUpCep(false);
        }
      });

    return () => controller.abort();
  }, [branchForm.postalCode]);

  const handleBranchSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!branchForm.name.trim()) {
      toast.warning("Informe o nome da filial.");
      return;
    }

    if (!branchForm.street.trim() || !branchForm.number.trim() || !branchForm.district.trim() || !branchForm.city.trim() || !branchForm.state.trim()) {
      toast.warning("Preencha o endereco da filial.");
      return;
    }

    const latitude = parseCoordinate(branchForm.latitude);
    const longitude = parseCoordinate(branchForm.longitude);

    if ((branchForm.latitude && !Number.isFinite(latitude)) || (branchForm.longitude && !Number.isFinite(longitude))) {
      toast.warning("Latitude e longitude devem ser numeros validos.");
      return;
    }

    await saveBranchMutation.mutateAsync({
      name: branchForm.name.trim(),
      slug: branchForm.slug.trim() || slugify(branchForm.name),
      email: branchForm.email.trim() || undefined,
      phone: branchForm.phone ? onlyDigits(branchForm.phone) : undefined,
      status: branchForm.status,
      acceptsDelivery: branchForm.acceptsDelivery,
      acceptsPickup: branchForm.acceptsPickup,
      acceptsDineIn: branchForm.acceptsDineIn,
      address: {
        street: branchForm.street.trim(),
        number: branchForm.number.trim(),
        complement: branchForm.complement.trim() || undefined,
        district: branchForm.district.trim(),
        city: branchForm.city.trim(),
        state: branchForm.state.trim(),
        postalCode: onlyDigits(branchForm.postalCode),
        latitude,
        longitude,
        reference: branchForm.reference.trim() || undefined
      }
    });
  };

  const startEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    lastCepLookupRef.current = onlyDigits(branch.address?.postalCode ?? "");
    setBranchForm({
      name: branch.name,
      slug: branch.slug,
      email: branch.email ?? "",
      phone: formatPhone(branch.phone ?? ""),
      status: branch.status,
      acceptsDelivery: branch.acceptsDelivery,
      acceptsPickup: branch.acceptsPickup,
      acceptsDineIn: branch.acceptsDineIn,
      street: branch.address?.street ?? "",
      number: branch.address?.number ?? "",
      complement: branch.address?.complement ?? "",
      district: branch.address?.district ?? "",
      city: branch.address?.city ?? "",
      state: branch.address?.state ?? "",
      postalCode: formatCep(branch.address?.postalCode ?? ""),
      latitude: branch.address?.latitude === undefined || branch.address.latitude === null ? "" : String(branch.address.latitude).replace(".", ","),
      longitude: branch.address?.longitude === undefined || branch.address.longitude === null ? "" : String(branch.address.longitude).replace(".", ","),
      reference: branch.address?.reference ?? ""
    });
  };

  const closeEditModal = () => {
    setEditingBranch(null);
    setBranchForm(emptyBranchForm);
    setCepLookupError(null);
    lastCepLookupRef.current = "";
  };

  const renderBranchFields = () => (
    <div className="form-grid two-columns">
      <label className="field">
        <span>Nome</span>
        <div>
          <input
            value={branchForm.name}
            onChange={(event) =>
              setBranchForm((current) => ({
                ...current,
                name: event.target.value,
                slug: current.slug || slugify(event.target.value)
              }))
            }
            placeholder="Filial Centro"
          />
        </div>
      </label>
      <label className="field">
        <span>Slug</span>
        <div>
          <input value={branchForm.slug} onChange={(event) => setBranchForm((current) => ({ ...current, slug: slugify(event.target.value) }))} placeholder="filial-centro" />
        </div>
      </label>
      <label className="field">
        <span>Email</span>
        <div>
          <input value={branchForm.email} onChange={(event) => setBranchForm((current) => ({ ...current, email: event.target.value }))} placeholder="filial@restaurante.com" />
        </div>
      </label>
      <label className="field">
        <span>Telefone</span>
        <div>
          <input inputMode="tel" value={branchForm.phone} onChange={(event) => setBranchForm((current) => ({ ...current, phone: formatPhone(event.target.value) }))} placeholder="(00) 00000-0000" />
        </div>
      </label>
      <label className="field">
        <span>Status</span>
        <div>
          <select value={branchForm.status} onChange={(event) => setBranchForm((current) => ({ ...current, status: event.target.value as BranchForm["status"] }))}>
            <option value="ACTIVE">Ativa</option>
            <option value="INACTIVE">Inativa</option>
            <option value="CLOSED_TEMPORARILY">Fechada temporariamente</option>
          </select>
        </div>
      </label>
      <div className="branch-switches">
        <label><input checked={branchForm.acceptsDelivery} onChange={(event) => setBranchForm((current) => ({ ...current, acceptsDelivery: event.target.checked }))} type="checkbox" /> Entrega</label>
        <label><input checked={branchForm.acceptsPickup} onChange={(event) => setBranchForm((current) => ({ ...current, acceptsPickup: event.target.checked }))} type="checkbox" /> Retirada</label>
        <label><input checked={branchForm.acceptsDineIn} onChange={(event) => setBranchForm((current) => ({ ...current, acceptsDineIn: event.target.checked }))} type="checkbox" /> Consumo local</label>
      </div>
      <label className="field">
        <span>CEP</span>
        <div>
          <input inputMode="numeric" value={branchForm.postalCode} onChange={(event) => setBranchForm((current) => ({ ...current, postalCode: formatCep(event.target.value) }))} placeholder="00000-000" />
        </div>
        {isLookingUpCep ? <small className="field-hint">Buscando endereco...</small> : null}
        {cepLookupError ? <small className="field-hint field-hint-error">{cepLookupError}</small> : null}
      </label>
      <label className="field">
        <span>Rua</span>
        <div>
          <input value={branchForm.street} onChange={(event) => setBranchForm((current) => ({ ...current, street: event.target.value }))} placeholder="Rua" />
        </div>
      </label>
      <label className="field">
        <span>Numero</span>
        <div>
          <input value={branchForm.number} onChange={(event) => setBranchForm((current) => ({ ...current, number: event.target.value }))} placeholder="123" />
        </div>
      </label>
      <label className="field">
        <span>Complemento</span>
        <div>
          <input value={branchForm.complement} onChange={(event) => setBranchForm((current) => ({ ...current, complement: event.target.value }))} placeholder="Loja 1" />
        </div>
      </label>
      <label className="field">
        <span>Bairro</span>
        <div>
          <input value={branchForm.district} onChange={(event) => setBranchForm((current) => ({ ...current, district: event.target.value }))} placeholder="Centro" />
        </div>
      </label>
      <label className="field">
        <span>Cidade</span>
        <div>
          <input value={branchForm.city} onChange={(event) => setBranchForm((current) => ({ ...current, city: event.target.value }))} placeholder="Cidade" />
        </div>
      </label>
      <label className="field">
        <span>UF</span>
        <div>
          <input maxLength={2} value={branchForm.state} onChange={(event) => setBranchForm((current) => ({ ...current, state: event.target.value.toUpperCase() }))} placeholder="SP" />
        </div>
      </label>
      <label className="field">
        <span>Latitude</span>
        <div>
          <input inputMode="decimal" value={branchForm.latitude} onChange={(event) => setBranchForm((current) => ({ ...current, latitude: event.target.value }))} placeholder="-23,5505" />
        </div>
      </label>
      <label className="field">
        <span>Longitude</span>
        <div>
          <input inputMode="decimal" value={branchForm.longitude} onChange={(event) => setBranchForm((current) => ({ ...current, longitude: event.target.value }))} placeholder="-46,6333" />
        </div>
      </label>
      <label className="field full-field">
        <span>Referencia</span>
        <div>
          <input value={branchForm.reference} onChange={(event) => setBranchForm((current) => ({ ...current, reference: event.target.value }))} placeholder="Proximo a..." />
        </div>
      </label>
    </div>
  );

  return (
    <>
      <form className="panel branch-form-panel" onSubmit={handleBranchSubmit}>
        <div className="delivery-heading">
          <div>
            <h2>Nova filial</h2>
            <p className="muted-text">Cadastre a base usada para entregas, retirada e calculo por raio.</p>
          </div>
          <Building2 size={20} />
        </div>

        {renderBranchFields()}

        <div className="delivery-form-actions">
          <button className="primary-button" disabled={saveBranchMutation.isPending} type="submit">
            {saveBranchMutation.isPending ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
            Criar filial
          </button>
        </div>
      </form>

      <section className="panel branch-list-panel">
        <h2>Filiais cadastradas</h2>
        <div className="branch-list">
          {branches.map((branch) => (
            <article className="branch-card" key={branch.id}>
              <div>
                <strong>{branch.name}</strong>
                <span>{branch.address ? `${branch.address.street}, ${branch.address.number} - ${branch.address.district}` : "Endereco nao informado"}</span>
              </div>
              <StatusBadge status={branch.status} />
              <button onClick={() => startEditBranch(branch)} type="button">Editar</button>
              <button className="danger-link-button" onClick={() => setBranchPendingDelete(branch)} type="button">
                <Trash2 size={16} />
              </button>
            </article>
          ))}
          {branches.length === 0 ? <p className="muted-text">Nenhuma filial cadastrada ainda.</p> : null}
        </div>
      </section>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Remover"
        description={`A filial ${branchPendingDelete?.name ?? ""} deixara de aparecer nas configuracoes de entrega.`}
        isLoading={deleteBranchMutation.isPending}
        onCancel={() => setBranchPendingDelete(null)}
        onConfirm={() => branchPendingDelete && deleteBranchMutation.mutate(branchPendingDelete.id)}
        open={Boolean(branchPendingDelete)}
        title="Remover filial?"
      />
      {editingBranch ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={saveBranchMutation.isPending ? undefined : closeEditModal}>
          <form className="modal-card product-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={handleBranchSubmit} role="dialog" aria-modal="true" aria-label="Editar filial">
            <div className="modal-header">
              <div>
                <span className="eyebrow">Filial</span>
                <h2>Editar filial</h2>
              </div>
              <button aria-label="Fechar modal" className="ghost-icon-button" onClick={closeEditModal} type="button">
                <X size={18} />
              </button>
            </div>
            {renderBranchFields()}
            <div className="branch-modal-actions">
              <button className="secondary-button" onClick={closeEditModal} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={saveBranchMutation.isPending} type="submit">
                {saveBranchMutation.isPending ? <Loader2 className="spin" size={18} /> : null}
                Salvar filial
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

import { FormEvent, useEffect, useState } from "react";
import { Edit3, PackageCheck, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { CategoryDraft, ProductDraft, useCatalog } from "../../app/providers/catalog-provider";
import { ProductCard } from "../../components/menu/product-card";
import { PageHeader } from "../../components/ui/page-header";
import { StatusBadge } from "../../components/ui/status-badge";
import { MenuCategory, Product, ProductStatus, ProductTemplate } from "../../types/database";
import { menuService } from "../../services/menu";
import { formatCurrency } from "../../utils/format";

const emptyCategoryDraft: CategoryDraft = {
  name: "",
  description: "",
  imageUrl: "",
  status: "ACTIVE"
};

const emptyProductDraft: ProductDraft = {
  categoryId: "",
  name: "",
  description: "",
  sku: "",
  imageUrl: "",
  imageUpload: undefined,
  basePrice: 0,
  promotionalPrice: undefined,
  costPrice: undefined,
  preparationTime: 20,
  status: "ACTIVE",
  isFeatured: false,
  stockQuantity: 10,
  ingredients: [],
  complements: []
};

const emptyTemplateDraft = {
  name: "",
  description: "",
  ingredients: [] as string[],
  complements: [] as Array<{ name: string; price: number }>
} satisfies TemplateDraft;

type TemplateDraft = {
  name: string;
  description: string;
  ingredients: string[];
  complements: Array<{ name: string; price: number }>;
};

function categoryToDraft(category: MenuCategory): CategoryDraft {
  return {
    name: category.name,
    description: category.description ?? "",
    imageUrl: category.imageUrl ?? "",
    status: category.status
  };
}

function productToDraft(product: Product, stockQuantity: number): ProductDraft {
  const ingredientGroup = product.optionGroups.find((group) => group.name === "Ingredientes");
  const complementGroup = product.optionGroups.find((group) => group.name === "Complementos");

  return {
    categoryId: product.categoryId,
    name: product.name,
    description: product.description ?? "",
    sku: product.sku ?? "",
    imageUrl: product.imageUrl ?? "",
    imageUpload: undefined,
    basePrice: product.basePrice,
    promotionalPrice: product.promotionalPrice,
    costPrice: product.costPrice,
    preparationTime: product.preparationTime,
    status: product.status === "OUT_OF_STOCK" && stockQuantity > 0 ? "ACTIVE" : product.status,
    isFeatured: product.isFeatured,
    stockQuantity,
    ingredients: ingredientGroup?.items.map((item) => item.name) ?? [],
    complements: complementGroup?.items.map((item) => ({ name: item.name, price: item.price })) ?? []
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatMoneyInput(value: number | undefined) {
  if (value === undefined) return "";

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function parseMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

function readImageUpload(file: File) {
  return new Promise<NonNullable<ProductDraft["imageUpload"]>>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);
      const [, dataBase64 = ""] = result.split(",");

      resolve({
        fileName: file.name,
        mimeType: file.type as NonNullable<ProductDraft["imageUpload"]>["mimeType"],
        dataBase64
      });
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AdminMenu() {
  const {
    categories,
    products,
    productAvailability,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductStock,
    loading,
    error,
    refreshAdminCatalog
  } = useCatalog();
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategoryDraft);
  const [productDraft, setProductDraft] = useState<ProductDraft>({ ...emptyProductDraft, categoryId: categories[0]?.id ?? "" });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [ingredientInput, setIngredientInput] = useState("");
  const [complementInput, setComplementInput] = useState({ name: "", price: "" });
  const [templateDraft, setTemplateDraft] = useState(emptyTemplateDraft);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateIngredientInput, setTemplateIngredientInput] = useState("");
  const [templateComplementInput, setTemplateComplementInput] = useState({ name: "", price: "" });
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const categoriesWithProducts = categories.map((category) => ({
    ...category,
    products: products.filter((product) => product.categoryId === category.id)
  }));

  useEffect(() => {
    void refreshAdminCatalog();
    void refreshTemplates();
  }, [refreshAdminCatalog]);

  const refreshTemplates = async () => {
    try {
      setTemplates(await menuService.listTemplates());
    } catch (error) {
      toast.error(errorMessage(error, "Nao foi possivel carregar templates."));
    }
  };

  const scrollToCategory = (categoryId: string) => {
    document.getElementById(`admin-category-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCreateCategory = () => {
    setCategoryDraft(emptyCategoryDraft);
    setEditingCategoryId(null);
    setCategoryModalOpen(true);
  };

  const openEditCategory = (category: MenuCategory) => {
    setCategoryDraft(categoryToDraft(category));
    setEditingCategoryId(category.id);
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setCategoryModalOpen(false);
    setCategoryDraft(emptyCategoryDraft);
    setEditingCategoryId(null);
  };

  const openCreateProduct = () => {
    setProductDraft({ ...emptyProductDraft, categoryId: categories[0]?.id ?? "" });
    setEditingProductId(null);
    setIngredientInput("");
    setComplementInput({ name: "", price: "" });
    setProductModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setProductDraft(productToDraft(product, getProductStock(product.id)));
    setEditingProductId(product.id);
    setIngredientInput("");
    setComplementInput({ name: "", price: "" });
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    setProductModalOpen(false);
    setProductDraft({ ...emptyProductDraft, categoryId: categories[0]?.id ?? "" });
    setEditingProductId(null);
    setIngredientInput("");
    setComplementInput({ name: "", price: "" });
  };

  const openTemplateModal = () => {
    setTemplateDraft(emptyTemplateDraft);
    setEditingTemplateId(null);
    setTemplateIngredientInput("");
    setTemplateComplementInput({ name: "", price: "" });
    setTemplateModalOpen(true);
  };

  const openEditTemplate = (template: ProductTemplate) => {
    setTemplateDraft({
      name: template.name,
      description: template.description ?? "",
      ingredients: template.items.filter((item) => item.type === "INGREDIENT").map((item) => item.name),
      complements: template.items.filter((item) => item.type === "COMPLEMENT").map((item) => ({ name: item.name, price: item.price }))
    });
    setEditingTemplateId(template.id);
    setTemplateIngredientInput("");
    setTemplateComplementInput({ name: "", price: "" });
    setTemplateModalOpen(true);
  };

  const closeTemplateModal = () => {
    setTemplateDraft(emptyTemplateDraft);
    setEditingTemplateId(null);
    setTemplateIngredientInput("");
    setTemplateComplementInput({ name: "", price: "" });
    setTemplateModalOpen(false);
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (categoryDraft.name.trim().length < 2) {
      setActionError("Informe um nome de categoria com pelo menos 2 caracteres.");
      toast.warning("Informe um nome de categoria com pelo menos 2 caracteres.");
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, categoryDraft);
      } else {
        await createCategory(categoryDraft);
      }

      toast.success(editingCategoryId ? "Categoria atualizada." : "Categoria criada.");
      closeCategoryModal();
    } catch (error) {
      const message = errorMessage(error, "Nao foi possivel salvar a categoria.");
      setActionError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (productDraft.name.trim().length < 2 || !productDraft.categoryId) {
      setActionError("Informe nome do produto e categoria antes de salvar.");
      toast.warning("Informe nome do produto e categoria antes de salvar.");
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, productDraft);
      } else {
        await createProduct(productDraft);
      }

      toast.success(editingProductId ? "Produto atualizado." : "Produto criado.");
      closeProductModal();
    } catch (error) {
      const message = errorMessage(error, "Nao foi possivel salvar o produto.");
      setActionError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setActionError(null);

    try {
      await deleteCategory(categoryId);
      toast.success("Categoria excluida.");
    } catch (error) {
      const message = errorMessage(error, "Nao foi possivel excluir a categoria.");
      setActionError(message);
      toast.error(message);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setActionError(null);

    try {
      await deleteProduct(productId);
      toast.success("Produto excluido.");
    } catch (error) {
      const message = errorMessage(error, "Nao foi possivel excluir o produto.");
      setActionError(message);
      toast.error(message);
    }
  };

  const addIngredient = () => {
    const nextIngredient = ingredientInput.trim();
    if (!nextIngredient) return;

    setProductDraft((current) => ({
      ...current,
      ingredients: [...current.ingredients, nextIngredient]
    }));
    setIngredientInput("");
  };

  const removeIngredient = (index: number) => {
    setProductDraft((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const addComplement = () => {
    const name = complementInput.name.trim();
    if (!name) return;

    setProductDraft((current) => ({
      ...current,
      complements: [
        ...current.complements,
        {
          name,
          price: Number(complementInput.price.replace(",", ".")) || 0
        }
      ]
    }));
    setComplementInput({ name: "", price: "" });
  };

  const removeComplement = (index: number) => {
    setProductDraft((current) => ({
      ...current,
      complements: current.complements.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const applyTemplate = (template: ProductTemplate) => {
    const ingredients = template.items.filter((item) => item.type === "INGREDIENT").map((item) => item.name);
    const complements = template.items.filter((item) => item.type === "COMPLEMENT").map((item) => ({ name: item.name, price: item.price }));

    setProductDraft((current) => ({
      ...current,
      ingredients,
      complements
    }));
    setIngredientInput("");
    setComplementInput({ name: "", price: "" });
    toast.info(`Template "${template.name}" aplicado.`);
  };

  const handleProductImageChange = async (file: File | undefined) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.warning("Use uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning("A imagem deve ter ate 5MB.");
      return;
    }

    try {
      const imageUpload = await readImageUpload(file);
      setProductDraft((current) => ({
        ...current,
        imageUrl: URL.createObjectURL(file),
        imageUpload
      }));
      toast.info("Imagem selecionada para envio.");
    } catch {
      toast.error("Nao foi possivel ler a imagem.");
    }
  };

  const addTemplateIngredient = () => {
    const ingredient = templateIngredientInput.trim();
    if (!ingredient) return;

    setTemplateDraft((current) => ({ ...current, ingredients: [...current.ingredients, ingredient] }));
    setTemplateIngredientInput("");
  };

  const removeTemplateIngredient = (index: number) => {
    setTemplateDraft((current) => ({ ...current, ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const addTemplateComplement = () => {
    const name = templateComplementInput.name.trim();
    if (!name) return;

    setTemplateDraft((current) => ({
      ...current,
      complements: [...current.complements, { name, price: Number(templateComplementInput.price.replace(",", ".")) || 0 }]
    }));
    setTemplateComplementInput({ name: "", price: "" });
  };

  const removeTemplateComplement = (index: number) => {
    setTemplateDraft((current) => ({ ...current, complements: current.complements.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const saveTemplateFromDraft = async () => {
    const name = templateDraft.name.trim();

    if (!name || (templateDraft.ingredients.length === 0 && templateDraft.complements.length === 0)) {
      toast.warning("Informe um nome e adicione ingredientes ou complementos para criar o template.");
      return;
    }

    const payload = {
      name,
      description: templateDraft.description,
      items: [
        ...templateDraft.ingredients.map((ingredient, index) => ({
          type: "INGREDIENT" as const,
          name: ingredient,
          price: 0,
          sortOrder: index + 1,
          status: "ACTIVE" as const
        })),
        ...templateDraft.complements.map((complement, index) => ({
          type: "COMPLEMENT" as const,
          name: complement.name,
          price: complement.price,
          sortOrder: index + 1,
          status: "ACTIVE" as const
        }))
      ]
    };

    try {
      if (editingTemplateId) {
        await menuService.updateTemplate(editingTemplateId, payload);
      } else {
        await menuService.createTemplate(payload);
      }

      await refreshTemplates();
      closeTemplateModal();
      toast.success(editingTemplateId ? "Template atualizado." : "Template salvo.");
    } catch (error) {
      toast.error(errorMessage(error, "Nao foi possivel salvar o template."));
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await menuService.deleteTemplate(templateId);
      await refreshTemplates();
      toast.success("Template excluido.");
    } catch (error) {
      toast.error(errorMessage(error, "Nao foi possivel excluir o template."));
    }
  };

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Cardapio"
        title="Categorias e produtos"
        description="Gerencie o que aparece no menu do cliente, com status, complementos e estoque."
      />
      {error || actionError ? <p className="form-error">{actionError ?? error}</p> : null}
      {loading ? <p className="muted-text">Carregando catalogo...</p> : null}

      <div className="admin-grid">
        <article className="panel">
          <div className="panel-title-row">
            <h2>Categorias</h2>
            <button className="ghost-icon-button emphasis" onClick={openCreateCategory}>
              <Plus size={18} /> Categoria
            </button>
          </div>

          {categories.map((category) => (
            <div className="management-row" key={category.id}>
              <div>
                <strong>{category.name}</strong>
                <span>{category.description || "Sem descricao"}</span>
              </div>
              <StatusBadge status={category.status} />
              <div className="row-actions">
                <button aria-label={`Editar ${category.name}`} onClick={() => openEditCategory(category)}>
                  <Edit3 size={16} />
                </button>
                <button aria-label={`Excluir ${category.name}`} onClick={() => void handleDeleteCategory(category.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </article>

        <article className="panel">
          <h2>Estoque</h2>
          {productAvailability.map((availability) => {
            const product = products.find((item) => item.id === availability.productId);
            return (
              <div className="management-row stock-row" key={availability.id}>
                <div>
                  <strong>{product?.name}</strong>
                  <span>Estoque {availability.stockQuantity ?? 0}</span>
                </div>
                <StatusBadge status={product?.status ?? "INACTIVE"} />
                <PackageCheck size={18} />
              </div>
            );
          })}
        </article>
      </div>

      <article className="panel">
        <div className="panel-title-row">
          <div>
            <h2>Templates de preparo</h2>
            <p className="muted-text">Modelos para popular ingredientes e adicionais ao cadastrar produtos.</p>
          </div>
          <button className="ghost-icon-button emphasis" onClick={openTemplateModal}>
            <Plus size={18} /> Template
          </button>
        </div>
        <div className="template-card-grid">
          {templates.map((template) => (
            <div className="template-card" key={template.id}>
              <strong>{template.name}</strong>
              <span>{template.items.filter((item) => item.type === "INGREDIENT").length} ingredientes</span>
              <span>{template.items.filter((item) => item.type === "COMPLEMENT").length} adicionais</span>
              <div className="row-actions wide">
                <button onClick={() => openEditTemplate(template)}>
                  <Edit3 size={16} /> Editar
                </button>
                <button onClick={() => void handleDeleteTemplate(template.id)}>
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <section className="section-block">
        <div className="panel-title-row">
          <h2>Produtos cadastrados</h2>
          <button className="pill-button" onClick={openCreateProduct}>
            <Plus size={17} /> Produto
          </button>
        </div>

        <div className="category-strip admin-category-filter" aria-label="Filtrar produtos por categoria">
          {categoriesWithProducts.map((category) => (
            <button key={category.id} onClick={() => scrollToCategory(category.id)}>
              {category.name}
            </button>
          ))}
        </div>

        <div className="category-product-sections">
          {categoriesWithProducts.map((category) => (
            <section className="category-product-section" id={`admin-category-${category.id}`} key={category.id}>
              <div className="category-section-header">
                <div>
                  <h3>{category.name}</h3>
                  {category.description ? <span>{category.description}</span> : null}
                </div>
                <StatusBadge status={category.status} />
              </div>

              <div className="catalog-product-list">
                {category.products.map((product) => {
                  const complements = product.optionGroups.find((group) => group.name === "Complementos")?.items ?? [];
                  const ingredients = product.optionGroups.find((group) => group.name === "Ingredientes")?.items ?? [];

                  return (
                    <article className="catalog-product-row" key={product.id}>
                      <ProductCard product={product} stockQuantity={getProductStock(product.id)} />
                      <div className="catalog-product-details">
                        <div>
                          <span className="eyebrow">{category.name}</span>
                          <h3>{product.name}</h3>
                          <p>{product.description}</p>
                        </div>
                        <div className="catalog-meta-grid">
                          <span>Base {formatCurrency(product.basePrice)}</span>
                          <span>Custo {formatCurrency(product.costPrice ?? 0)}</span>
                          <span>Estoque {getProductStock(product.id)}</span>
                          <StatusBadge status={product.status} />
                        </div>
                        <p className="muted-text">
                          Ingredientes: {ingredients.map((item) => item.name).join(", ") || "nao informado"}
                        </p>
                        <p className="muted-text">
                          Complementos: {complements.map((item) => `${item.name} (${formatCurrency(item.price)})`).join(", ") || "sem complementos"}
                        </p>
                        <div className="row-actions wide">
                          <button onClick={() => openEditProduct(product)}>
                            <Edit3 size={16} /> Editar
                          </button>
                          <button onClick={() => void handleDeleteProduct(product.id)}>
                            <Trash2 size={16} /> Excluir
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {category.products.length === 0 ? <p className="muted-text">Nenhum produto cadastrado nesta categoria.</p> : null}
              </div>
            </section>
          ))}
        </div>
      </section>

      {categoryModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card" onSubmit={handleCategorySubmit} role="dialog" aria-modal="true" aria-label="Cadastro de categoria">
            <div className="modal-header">
              <div>
                <span className="eyebrow">Categoria</span>
                <h2>{editingCategoryId ? "Editar categoria" : "Nova categoria"}</h2>
              </div>
              <button aria-label="Fechar modal" className="ghost-icon-button" onClick={closeCategoryModal} type="button">
                <X size={18} />
              </button>
            </div>

            <label className="field">
              <span>Nome</span>
              <div>
                <input value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} />
              </div>
            </label>

            <label className="field">
              <span>Descricao</span>
              <div>
                <input
                  value={categoryDraft.description}
                  onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })}
                />
              </div>
            </label>

            <label className="field">
              <span>Imagem</span>
              <div>
                <input value={categoryDraft.imageUrl} onChange={(event) => setCategoryDraft({ ...categoryDraft, imageUrl: event.target.value })} />
              </div>
            </label>

            <label className="field">
              <span>Status</span>
              <div>
                <select
                  value={categoryDraft.status}
                  onChange={(event) => setCategoryDraft({ ...categoryDraft, status: event.target.value as ProductStatus })}
                >
                  <option value="ACTIVE">Ativa</option>
                  <option value="INACTIVE">Inativa</option>
                  <option value="ARCHIVED">Arquivada</option>
                </select>
              </div>
            </label>

            <button className="primary-button" disabled={submitting} type="submit">
              <Save size={17} /> {editingCategoryId ? "Salvar categoria" : "Criar categoria"}
            </button>
          </form>
        </div>
      ) : null}

      {templateModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form
            className="modal-card product-modal"
            onSubmit={(event) => {
              event.preventDefault();
              void saveTemplateFromDraft();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Cadastro de template"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">Template</span>
                <h2>{editingTemplateId ? "Editar template" : "Novo template de preparo"}</h2>
              </div>
              <button aria-label="Fechar modal" className="ghost-icon-button" onClick={closeTemplateModal} type="button">
                <X size={18} />
              </button>
            </div>

            <label className="field">
              <span>Nome do template</span>
              <div>
                <input value={templateDraft.name} onChange={(event) => setTemplateDraft({ ...templateDraft, name: event.target.value })} placeholder="Ex: Hamburguer artesanal" />
              </div>
            </label>

            <label className="field">
              <span>Descricao</span>
              <div>
                <input
                  value={templateDraft.description}
                  onChange={(event) => setTemplateDraft({ ...templateDraft, description: event.target.value })}
                  placeholder="Ex: base dos lanches da casa"
                />
              </div>
            </label>

            <div className="editable-list-block">
              <span>Ingredientes padrao</span>
              <div className="inline-add-row">
                <input value={templateIngredientInput} onChange={(event) => setTemplateIngredientInput(event.target.value)} placeholder="Ex: pao brioche" />
                <button aria-label="Adicionar ingrediente ao template" onClick={addTemplateIngredient} type="button">
                  <Plus size={18} />
                </button>
              </div>
              <div className="editable-chip-list">
                {templateDraft.ingredients.map((ingredient, index) => (
                  <button key={`${ingredient}-${index}`} onClick={() => removeTemplateIngredient(index)} type="button">
                    {ingredient} <X size={14} />
                  </button>
                ))}
              </div>
            </div>

            <div className="editable-list-block">
              <span>Adicionais</span>
              <div className="inline-add-row complement-row">
                <input value={templateComplementInput.name} onChange={(event) => setTemplateComplementInput({ ...templateComplementInput, name: event.target.value })} placeholder="Ex: bacon" />
                <input value={templateComplementInput.price} onChange={(event) => setTemplateComplementInput({ ...templateComplementInput, price: event.target.value })} placeholder="Valor" />
                <button aria-label="Adicionar adicional ao template" onClick={addTemplateComplement} type="button">
                  <Plus size={18} />
                </button>
              </div>
              <div className="editable-chip-list">
                {templateDraft.complements.map((complement, index) => (
                  <button key={`${complement.name}-${index}`} onClick={() => removeTemplateComplement(index)} type="button">
                    {complement.name} {formatCurrency(complement.price)} <X size={14} />
                  </button>
                ))}
              </div>
            </div>

            <button className="primary-button" type="submit">
              <Save size={17} /> {editingTemplateId ? "Atualizar template" : "Salvar template"}
            </button>
          </form>
        </div>
      ) : null}

      {productModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card product-modal" onSubmit={handleProductSubmit} role="dialog" aria-modal="true" aria-label="Cadastro de produto">
            <div className="modal-header">
              <div>
                <span className="eyebrow">Produto</span>
                <h2>{editingProductId ? "Editar produto" : "Novo produto"}</h2>
              </div>
              <button aria-label="Fechar modal" className="ghost-icon-button" onClick={closeProductModal} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="form-grid two-columns">
              <label className="field">
                <span>Categoria</span>
                <div>
                  <select
                    value={productDraft.categoryId || categories[0]?.id || ""}
                    onChange={(event) => setProductDraft({ ...productDraft, categoryId: event.target.value })}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="field">
                <span>Status</span>
                <div>
                  <select
                    value={productDraft.status}
                    onChange={(event) => setProductDraft({ ...productDraft, status: event.target.value as ProductStatus })}
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="OUT_OF_STOCK">Esgotado</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>
              </label>

              <label className="field">
                <span>Nome</span>
                <div>
                  <input value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} />
                </div>
              </label>

              <label className="field">
                <span>SKU</span>
                <div>
                  <input value={productDraft.sku} onChange={(event) => setProductDraft({ ...productDraft, sku: event.target.value })} />
                </div>
              </label>

              <label className="field">
                <span>Preco base</span>
                <div>
                  <input
                    inputMode="numeric"
                    placeholder="0,00"
                    value={formatMoneyInput(productDraft.basePrice)}
                    onChange={(event) => setProductDraft({ ...productDraft, basePrice: parseMoneyInput(event.target.value) })}
                  />
                </div>
              </label>

              <label className="field">
                <span>Preco promocional</span>
                <div>
                  <input
                    inputMode="numeric"
                    placeholder="0,00"
                    value={formatMoneyInput(productDraft.promotionalPrice)}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        promotionalPrice: event.target.value.replace(/\D/g, "") ? parseMoneyInput(event.target.value) : undefined
                      })
                    }
                  />
                </div>
              </label>

              <label className="field">
                <span>Custo</span>
                <div>
                  <input
                    inputMode="numeric"
                    placeholder="0,00"
                    value={formatMoneyInput(productDraft.costPrice)}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        costPrice: event.target.value.replace(/\D/g, "") ? parseMoneyInput(event.target.value) : undefined
                      })
                    }
                  />
                </div>
              </label>

              <label className="field">
                <span>Estoque</span>
                <div>
                  <input
                    min="0"
                    type="number"
                    value={productDraft.stockQuantity}
                    onChange={(event) => setProductDraft({ ...productDraft, stockQuantity: Number(event.target.value) })}
                  />
                </div>
              </label>

              <label className="field">
                <span>Preparo em minutos</span>
                <div>
                  <input
                    min="1"
                    type="number"
                    value={productDraft.preparationTime}
                    onChange={(event) => setProductDraft({ ...productDraft, preparationTime: Number(event.target.value) })}
                  />
                </div>
              </label>

              <label className="toggle-field">
                <input
                  checked={productDraft.isFeatured}
                  onChange={(event) => setProductDraft({ ...productDraft, isFeatured: event.target.checked })}
                  type="checkbox"
                />
                <span>Mostrar nos destaques</span>
              </label>
            </div>

            <label className="field">
              <span>Descricao</span>
              <div>
                <input
                  value={productDraft.description}
                  onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })}
                />
              </div>
            </label>

            <label className="field">
              <span>Imagem</span>
              <div>
                <input accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleProductImageChange(event.target.files?.[0])} type="file" />
              </div>
            </label>
            {productDraft.imageUrl ? (
              <div className="product-image-preview">
                <img src={productDraft.imageUrl} alt="Previa do produto" />
                <span>{productDraft.imageUpload ? "Imagem pronta para upload" : "Imagem atual do produto"}</span>
              </div>
            ) : null}

            <div className="editable-list-block">
              <span>Templates de ingredientes</span>
              <div className="template-select-field">
                <select
                  defaultValue=""
                  onChange={(event) => {
                    const template = templates.find((item) => item.id === event.target.value);
                    if (template) applyTemplate(template);
                  }}
                >
                  <option value="" disabled>
                    Selecionar template
                  </option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="editable-list-block">
              <span>Ingredientes</span>
              <div className="inline-add-row">
                <input value={ingredientInput} onChange={(event) => setIngredientInput(event.target.value)} placeholder="Ex: queijo cheddar" />
                <button aria-label="Adicionar ingrediente" onClick={addIngredient} type="button">
                  <Plus size={18} />
                </button>
              </div>
              <div className="editable-chip-list">
                {productDraft.ingredients.map((ingredient, index) => (
                  <button key={`${ingredient}-${index}`} onClick={() => removeIngredient(index)} type="button">
                    {ingredient} <X size={14} />
                  </button>
                ))}
              </div>
            </div>

            <div className="editable-list-block">
              <span>Complementos</span>
              <div className="inline-add-row complement-row">
                <input
                  value={complementInput.name}
                  onChange={(event) => setComplementInput({ ...complementInput, name: event.target.value })}
                  placeholder="Ex: bacon"
                />
                <input
                  value={complementInput.price}
                  onChange={(event) => setComplementInput({ ...complementInput, price: event.target.value })}
                  placeholder="Valor"
                />
                <button aria-label="Adicionar complemento" onClick={addComplement} type="button">
                  <Plus size={18} />
                </button>
              </div>
              <div className="editable-chip-list">
                {productDraft.complements.map((complement, index) => (
                  <button key={`${complement.name}-${index}`} onClick={() => removeComplement(index)} type="button">
                    {complement.name} {formatCurrency(complement.price)} <X size={14} />
                  </button>
                ))}
              </div>
            </div>

            <button className="primary-button" disabled={submitting} type="submit">
              <Save size={17} /> {editingProductId ? "Salvar produto" : "Criar produto"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

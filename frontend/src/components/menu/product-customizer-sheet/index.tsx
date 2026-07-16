import "./styles.css";
import { Check, Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import type { CustomerRemovedIngredient, CustomerSelectedOption } from "../../../app/providers/customer-flow-provider";
import type { OptionGroup, OptionItem, Product } from "../../../types/database";
import { formatCurrency } from "../../../utils/format";
import { Button } from "../../ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from "../../ui/drawer";
import { Separator } from "../../ui/separator";
import { Textarea } from "../../ui/textarea";

type ProductCustomizerSheetProps = {
  product: Product;
  onAdd: (
    product: Product,
    options: CustomerSelectedOption[],
    notes: string,
    removedIngredients: CustomerRemovedIngredient[]
  ) => void;
  onClose: () => void;
};

function normalizeGroupName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isIngredientGroup(group: OptionGroup) {
  return normalizeGroupName(group.name) === "ingredientes";
}

export function ProductCustomizerSheet({ product, onAdd, onClose }: ProductCustomizerSheetProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, CustomerSelectedOption>>({});
  const [removedIngredients, setRemovedIngredients] = useState<Record<string, CustomerRemovedIngredient>>({});
  const [notes, setNotes] = useState("");
  const ingredientGroups = product.optionGroups.filter((group) => isIngredientGroup(group) && group.items.length > 0);
  const complementGroups = product.optionGroups.filter((group) => !isIngredientGroup(group) && group.items.length > 0);
  const ingredients = ingredientGroups.flatMap((group) => group.items);
  const selectedOptionList = Object.values(selectedOptions);
  const removedIngredientList = Object.values(removedIngredients);
  const total =
    (product.promotionalPrice ?? product.basePrice) +
    selectedOptionList.reduce((sum, option) => sum + option.unitPrice * option.quantity, 0);

  const toggleRemovedIngredient = (ingredient: OptionItem) => {
    setRemovedIngredients((current) => {
      if (current[ingredient.id]) {
        const next = { ...current };
        delete next[ingredient.id];
        return next;
      }

      return {
        ...current,
        [ingredient.id]: { optionItemId: ingredient.id, name: ingredient.name }
      };
    });
  };

  const toggleOption = (group: OptionGroup, option: OptionItem) => {
    setSelectedOptions((current) => {
      if (current[option.id]) {
        const next = { ...current };
        delete next[option.id];
        return next;
      }

      const selectedInGroup = group.items.filter((item) => current[item.id]).length;

      if (group.maxSelection > 0 && selectedInGroup >= group.maxSelection) {
        toast.info(`Escolha no maximo ${group.maxSelection} item(ns) em ${group.name}.`);
        return current;
      }

      return {
        ...current,
        [option.id]: {
          optionItemId: option.id,
          optionName: option.name,
          quantity: 1,
          unitPrice: option.price
        }
      };
    });
  };

  const handleAdd = () => {
    const incompleteGroup = complementGroups.find((group) => {
      const selectedCount = group.items.filter((item) => selectedOptions[item.id]).length;
      return selectedCount < group.minSelection;
    });

    if (incompleteGroup) {
      toast.info(`Escolha pelo menos ${incompleteGroup.minSelection} item(ns) em ${incompleteGroup.name}.`);
      return;
    }

    onAdd(product, selectedOptionList, notes.trim(), removedIngredientList);
  };

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent aria-describedby="product-customizer-description">
        <DrawerHeader>
          <div className="product-customizer-heading">
            <span className="eyebrow">{product.name}</span>
            <DrawerTitle>Como deseja seu pedido?</DrawerTitle>
            <DrawerDescription id="product-customizer-description">
              Personalize ingredientes, complementos e observacoes.
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button aria-label="Fechar personalizacao" size="icon" variant="ghost">
              <X data-icon="inline-start" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <DrawerBody className="product-customizer-body">
          {ingredients.length > 0 ? (
            <section className="customizer-section" aria-labelledby="included-ingredients-title">
              <div className="customizer-section-heading">
                <div>
                  <h3 id="included-ingredients-title">Ingredientes padrao</h3>
                  <p>Itens inclusos no produto.</p>
                </div>
                <span className="customizer-count">{ingredients.length}</span>
              </div>
              <div className="complete-sandwich-box">
                <strong>{ingredients.map((ingredient) => ingredient.name).join(", ")}</strong>
              </div>
            </section>
          ) : null}

          {ingredients.length > 0 ? <Separator /> : null}

          {ingredients.length > 0 ? (
            <fieldset className="customizer-section customizer-fieldset">
              <legend>Retirar ingredientes</legend>
              <p>Selecione somente o que nao deseja receber.</p>

              <button
                aria-pressed={removedIngredientList.length === 0}
                className={removedIngredientList.length === 0 ? "customizer-option selected" : "customizer-option"}
                onClick={() => setRemovedIngredients({})}
                type="button"
              >
                <div>
                  <strong>Lanche completo</strong>
                  <span>Manter todos os ingredientes padrao.</span>
                </div>
                {removedIngredientList.length === 0 ? <Check aria-hidden="true" /> : null}
              </button>

              {ingredients.map((ingredient) => {
                const removed = Boolean(removedIngredients[ingredient.id]);

                return (
                  <button
                    aria-pressed={removed}
                    className={removed ? "customizer-option customizer-remove-option selected" : "customizer-option customizer-remove-option"}
                    key={ingredient.id}
                    onClick={() => toggleRemovedIngredient(ingredient)}
                    type="button"
                  >
                    <div>
                      <strong>Retirar {ingredient.name}</strong>
                      <span>{removed ? "Este ingrediente nao sera enviado." : "Toque para remover do pedido."}</span>
                    </div>
                    {removed ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}
                  </button>
                );
              })}
            </fieldset>
          ) : null}

          {complementGroups.map((group) => (
            <fieldset className="customizer-section customizer-fieldset" key={group.id}>
              <legend>{group.name}</legend>
              <p>
                Min: {group.minSelection} | Max: {group.maxSelection}
              </p>
              {group.items.map((option) => {
                const selected = Boolean(selectedOptions[option.id]);

                return (
                  <button
                    aria-pressed={selected}
                    className={selected ? "customizer-option selected" : "customizer-option"}
                    key={option.id}
                    onClick={() => toggleOption(group, option)}
                    type="button"
                  >
                    <div>
                      <strong>{option.name}</strong>
                      {option.description ? <span>{option.description}</span> : null}
                      <small>{option.price > 0 ? formatCurrency(option.price) : "Sem custo adicional"}</small>
                    </div>
                    {selected ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}
                  </button>
                );
              })}
            </fieldset>
          ))}

          <Separator />

          <label className="customizer-notes-field" htmlFor="product-customization-notes">
            <span>Observacoes</span>
            <Textarea
              id="product-customization-notes"
              maxLength={180}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex: molho separado, ponto da carne, embalagem extra..."
              value={notes}
            />
            <small>{notes.length}/180 caracteres</small>
          </label>
        </DrawerBody>

        <DrawerFooter className="product-customizer-footer">
          <div>
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <Button onClick={handleAdd}>
            <Plus data-icon="inline-start" />
            Adicionar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | Saborosamente" },
      {
        name: "description",
        content:
          "Informe os dados de entrega e a forma de pagamento para concluir seu pedido de marmitas.",
      },
      { property: "og:title", content: "Checkout | Saborosamente" },
      {
        property: "og:description",
        content: "Finalize seu pedido de marmitas congeladas.",
      },
    ],
  }),
  component: Checkout,
});

const checkoutSchema = z
  .object({
    nome: z.string().trim().min(3, "Informe seu nome completo").max(80),
    email: z.string().trim().email("E-mail inválido").max(120),
    telefone: z.string().trim().min(10, "Telefone com DDD").max(20),
    cep: z.string().trim().optional(),
    endereco: z.string().trim().min(5, "Informe rua e número").max(160),
    complemento: z.string().trim().max(80).optional(),
    cidade: z.string().trim().min(2, "Informe a cidade").max(80),
    pagamento: z.enum(["pix", "cartao", "alimentacao", "mercadopago", "dinheiro"]),
    troco: z.string().trim().optional(),
    observacoes: z.string().trim().max(300).optional(),
  })
  .superRefine((data, ctx) => {
    // troco obrigatório apenas quando pagamento = dinheiro e o campo não estiver vazio
    // (deixamos opcional — só validamos se preenchido)
    if (data.pagamento === "dinheiro" && data.troco && isNaN(Number(data.troco))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe um valor numérico para o troco",
        path: ["troco"],
      });
    }
  });

type CheckoutForm = z.infer<typeof checkoutSchema>;

// ─── dados das opções de pagamento ───────────────────────────────────────────

type PaymentValue = CheckoutForm["pagamento"];

interface PaymentOption {
  value: PaymentValue;
  label: string;
  sublabel: string;
  icon: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { value: "pix",        label: "PIX",          sublabel: "Na entrega",        icon: "🟢" },
  { value: "cartao",     label: "Cartão",        sublabel: "Crédito/Débito",    icon: "💳" },
  { value: "alimentacao",label: "Alimentação",   sublabel: "Refeição/VR",       icon: "🍴" },
  { value: "mercadopago",label: "Mercado Pago",  sublabel: "Link",              icon: "🔵" },
  { value: "dinheiro",   label: "Dinheiro",      sublabel: "Na entrega",        icon: "💵" },
];

const CARD_BRANDS = [
  "Visa",
  "Mastercard",
  "Hiper",
  "Elo",
  "Hipercard",
  "Diners Club International",
  "American Express",
];

const FOOD_VOUCHERS = [
  "VR",
  "Ticket",
  "Util Card",
  "Alelo",
  "Pluxee",
  "Sodexo",
  "Flash",
  "O² Plus Card",
  "Benefícios",
  "Caju",
  "Bee",
];

// ─── estilos reutilizáveis ────────────────────────────────────────────────────

const fieldClass =
  "mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring";

// ─── componente principal ─────────────────────────────────────────────────────

function Checkout() {
  const {
    lines,
    subtotal,
    shipping,
    total,
    clear,
    selectedCity,
    setSelectedCity,
    selectedBairro,
    setSelectedBairro,
    taxas,
  } = useCart();

  const navigate = useNavigate();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentValue>("pix");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      pagamento: "pix",
      cidade: selectedCity,
    },
  });

  function handlePaymentSelect(value: PaymentValue) {
    setSelectedPayment(value);
    setValue("pagamento", value, { shouldValidate: true });
  }

  const onSubmit = async (data: CheckoutForm) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const id = `SB-${Date.now().toString().slice(-6)}`;
      console.info("[checkout] pedido simulado", {
        id,
        cliente: data.nome,
        itens: lines.length,
      });
      setOrderId(id);
      clear();
      toast.success("Pedido registrado!", { description: `Protocolo ${id}` });
    } catch (error) {
      console.error("[checkout] falha ao registrar pedido", error);
      toast.error("Não foi possível registrar o pedido. Tente novamente.");
    }
  };

  // ── tela de confirmação ──────────────────────────────────────────────────────
  if (orderId) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" aria-hidden="true" />
        <h1 className="mt-6 text-3xl font-extrabold">Pedido recebido!</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Protocolo <strong className="text-foreground">{orderId}</strong>. Em breve entraremos em
          contato para confirmar a entrega.
        </p>
        <Link
          to="/catalogo"
          className="mt-8 inline-flex rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground"
        >
          Continuar comprando
        </Link>
      </section>
    );
  }

  // ── carrinho vazio ───────────────────────────────────────────────────────────
  if (lines.length === 0) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-3xl font-extrabold">Checkout</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Você ainda não escolheu nenhuma marmita.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/catalogo" })}
          className="mt-8 inline-flex rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground"
        >
          Ver catálogo
        </button>
      </section>
    );
  }

  // ── formulário principal ─────────────────────────────────────────────────────
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-4xl font-extrabold">Checkout</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Preencha os dados de entrega e escolha a forma de pagamento.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-soft"
        >
          {/* ── dados pessoais ─────────────────────────────────────────────── */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Seus dados
            </legend>
            <div>
              <label htmlFor="nome" className="text-sm font-medium">
                Nome completo
              </label>
              <input id="nome" className={fieldClass} {...register("nome")} />
              {errors.nome && (
                <p className="mt-1 text-xs text-destructive">{errors.nome.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  className={fieldClass}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="telefone" className="text-sm font-medium">
                  Telefone / WhatsApp
                </label>
                <input id="telefone" className={fieldClass} {...register("telefone")} />
                {errors.telefone && (
                  <p className="mt-1 text-xs text-destructive">{errors.telefone.message}</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* ── entrega ────────────────────────────────────────────────────── */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Entrega
            </legend>
            <div>
              <label htmlFor="cidade" className="text-sm font-medium">
                Cidade
              </label>
              <select
                id="cidade"
                className={fieldClass}
                {...register("cidade")}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedBairro("");
                }}
              >
                <option value="">Selecione...</option>
                {[...new Set(taxas.map((t) => t.cidade))]
                  .sort()
                  .map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
              </select>
              {errors.cidade && (
                <p className="mt-1 text-xs text-destructive">{errors.cidade.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="bairro" className="text-sm font-medium">
                  Bairro
                </label>
                <select
                  id="bairro"
                  className={cn(fieldClass, !selectedCity && "opacity-50")}
                  disabled={!selectedCity}
                  value={selectedBairro}
                  onChange={(e) => setSelectedBairro(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {taxas
                    .filter((t) => t.cidade === selectedCity)
                    .sort((a, b) => a.bairro.localeCompare(b.bairro))
                    .map((t) => (
                      <option key={t.id} value={t.bairro}>
                        {t.bairro}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label htmlFor="cep" className="text-sm font-medium">
                  CEP (opcional)
                </label>
                <input
                  id="cep"
                  placeholder="00000-000"
                  className={fieldClass}
                  {...register("cep")}
                />
              </div>
            </div>

            <div>
              <label htmlFor="endereco" className="text-sm font-medium">
                Endereço e número
              </label>
              <input id="endereco" className={fieldClass} {...register("endereco")} />
              {errors.endereco && (
                <p className="mt-1 text-xs text-destructive">{errors.endereco.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="complemento" className="text-sm font-medium">
                Complemento (opcional)
              </label>
              <input id="complemento" className={fieldClass} {...register("complemento")} />
            </div>
          </fieldset>

          {/* ── pagamento ──────────────────────────────────────────────────── */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Pagamento
            </legend>

            {/* campo hidden que o react-hook-form usa para validação */}
            <input type="hidden" {...register("pagamento")} />

            {/* grade de botões */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = selectedPayment === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handlePaymentSelect(opt.value)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border p-4 text-center transition-colors",
                      isSelected
                        ? "border-primary bg-secondary font-semibold"
                        : "border-border hover:border-primary",
                    )}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {opt.icon}
                    </span>
                    <span className="text-sm font-semibold leading-tight">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.sublabel}</span>
                  </button>
                );
              })}
            </div>

            {/* ── conteúdo condicional por método ─────────────────────────── */}

            {/* PIX ou Mercado Pago → mensagem WhatsApp */}
            {(selectedPayment === "pix" || selectedPayment === "mercadopago") && (
              <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <MessageCircle className="mt-0.5 size-5 shrink-0 text-green-600" aria-hidden="true" />
                <p>
                  Após confirmar o pedido, enviaremos o{" "}
                  <strong>
                    {selectedPayment === "pix" ? "código PIX" : "link de pagamento"}
                  </strong>{" "}
                  via <strong>WhatsApp</strong>. Mantenha o aplicativo aberto para receber. 📲
                </p>
              </div>
            )}

            {/* Cartão → bandeiras aceitas */}
            {selectedPayment === "cartao" && (
              <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                <p className="text-sm font-semibold">💳 Cartão de crédito</p>
                <ul className="flex flex-wrap gap-2">
                  {CARD_BRANDS.map((brand) => (
                    <li
                      key={brand}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                    >
                      {brand}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alimentação → redes aceitas */}
            {selectedPayment === "alimentacao" && (
              <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                <p className="text-sm font-semibold">🍴 Alimentação / Refeição</p>
                <ul className="flex flex-wrap gap-2">
                  {FOOD_VOUCHERS.map((voucher) => (
                    <li
                      key={voucher}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                    >
                      {voucher}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dinheiro → campo de troco */}
            {selectedPayment === "dinheiro" && (
              <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                <p className="text-sm font-semibold">💵 Troco</p>
                <label htmlFor="troco" className="text-sm text-muted-foreground">
                  Precisa de troco? Informe o valor que vai pagar (opcional)
                </label>
                <input
                  id="troco"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 50,00"
                  className={fieldClass}
                  {...register("troco")}
                />
                {errors.troco && (
                  <p className="mt-1 text-xs text-destructive">{errors.troco.message}</p>
                )}
              </div>
            )}
          </fieldset>

          {/* ── observações ────────────────────────────────────────────────── */}
          <div>
            <label htmlFor="observacoes" className="text-sm font-medium">
              Observações (opcional)
            </label>
            <textarea
              id="observacoes"
              rows={3}
              className={fieldClass}
              {...register("observacoes")}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {isSubmitting
              ? "Registrando pedido..."
              : `Confirmar pedido • ${formatBRL(total)}`}
          </button>
        </form>

        {/* ── resumo do pedido ──────────────────────────────────────────────── */}
        <aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Seu pedido</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {lines.map(({ product, quantity, subtotal: lineTotal }) => (
              <li key={product.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {quantity}× {product.nome}
                </span>
                <span className="font-medium">{formatBRL(lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatBRL(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Entrega</dt>
              <dd>{shipping === 0 ? "Grátis" : formatBRL(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold text-primary">{formatBRL(total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

const ORDER_STEPS = [
  {
    id: "cart",
    label: "Cart",
    caption: "Review items",
  },
  {
    id: "checkout",
    label: "Checkout",
    caption: "Name, address, payment",
  },
  {
    id: "confirmation",
    label: "Confirmation",
    caption: "Order placed",
  },
] as const;

export type OrderFlowStep = (typeof ORDER_STEPS)[number]["id"];

interface OrderFlowStepsProps {
  currentStep: OrderFlowStep;
}

export function OrderFlowSteps({ currentStep }: OrderFlowStepsProps) {
  const currentIndex = ORDER_STEPS.findIndex((step) => step.id === currentStep);

  return (
    <section className="order-flow" aria-label="Order progress">
      {ORDER_STEPS.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isComplete = index < currentIndex;

        return (
          <article
            key={step.id}
            className={`order-flow__step${isCurrent ? " is-current" : ""}${isComplete ? " is-complete" : ""}`}
          >
            <span className="order-flow__number">{index + 1}</span>
            <div className="order-flow__copy">
              <strong>{step.label}</strong>
              <span>{step.caption}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}

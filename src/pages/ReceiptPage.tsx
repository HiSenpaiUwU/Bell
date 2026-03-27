import { useEffect, useRef, useState } from "react";
import { OrderFlowSteps } from "../components/order/OrderFlowSteps";
import { useCart } from "../context/CartContextFixed";
import { formatCurrency, formatPaymentMethod } from "../utils/format";
import { navigateTo } from "../utils/navigation";

const TRACKING_STEPS = [
  {
    label: "Preparing \uD83C\uDF73",
    caption: "The kitchen is packing your order now.",
  },
  {
    label: "On the way \uD83D\uDE9A",
    caption: "Your rider is heading to the delivery address.",
  },
  {
    label: "Delivered \u2705",
    caption: "Your order reached the customer successfully.",
  },
];

export function ReceiptPage() {
  const { clearLastOrder, lastOrder } = useCart();
  const receiptContentRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [trackingStepIndex, setTrackingStepIndex] = useState(0);

  useEffect(() => {
    if (!lastOrder) {
      return;
    }

    setTrackingStepIndex(0);

    const firstTimeoutId = window.setTimeout(() => {
      setTrackingStepIndex(1);
    }, 3600);
    const secondTimeoutId = window.setTimeout(() => {
      setTrackingStepIndex(2);
    }, 9200);

    return () => {
      window.clearTimeout(firstTimeoutId);
      window.clearTimeout(secondTimeoutId);
    };
  }, [lastOrder?.orderNumber]);

  const handleDownloadReceipt = async () => {
    if (!lastOrder || !receiptContentRef.current || isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(receiptContentRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 28;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const imageHeight = (canvas.height * printableWidth) / canvas.width;
      let remainingHeight = imageHeight;

      pdf.addImage(imageData, "PNG", margin, margin, printableWidth, imageHeight);
      remainingHeight -= printableHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        const offsetY = margin - (imageHeight - remainingHeight);
        pdf.addImage(imageData, "PNG", margin, offsetY, printableWidth, imageHeight);
        remainingHeight -= printableHeight;
      }

      pdf.save(`${lastOrder.orderNumber}-receipt.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBackHome = () => {
    clearLastOrder();
    navigateTo("/");
  };

  if (!lastOrder) {
    return (
      <section className="auth-page">
        <div className="auth-card receipt-card receipt-card--empty">
          <h1>No receipt found</h1>
          <p>Complete an order first before opening the receipt page.</p>
          <button type="button" className="cta-link" onClick={() => navigateTo("/")}>
            Back to Home
          </button>
        </div>
      </section>
    );
  }

  const totalItems = lastOrder.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="auth-page receipt-page">
      <div className="receipt-card receipt-card--premium">
        <div
          ref={receiptContentRef}
          className="receipt-download-content receipt-download-content--premium"
        >
          <OrderFlowSteps currentStep="confirmation" />

          <section className="receipt-hero receipt-hero--premium">
            <div>
              <p className="eyebrow">Order confirmation</p>
              <h1>Thanks, your order is confirmed</h1>
              <p className="section-copy">
                Your order is placed, your summary is saved below, and you can still
                download a clean receipt copy anytime.
              </p>
            </div>

            <div className="receipt-order-badge">
              <span>Order Number</span>
              <strong>{lastOrder.orderNumber}</strong>
            </div>
          </section>

          <section className="receipt-tracking-card">
            <div className="receipt-panel__header">
              <div>
                <p className="eyebrow">Order tracking</p>
                <h2>Delivery progress</h2>
              </div>
              <p className="summary-note">{TRACKING_STEPS[trackingStepIndex]?.caption}</p>
            </div>

            <div className="receipt-tracking-steps">
              {TRACKING_STEPS.map((step, index) => (
                <article
                  key={step.label}
                  className={`receipt-tracking-step${index <= trackingStepIndex ? " is-active" : ""}`}
                >
                  <span>{index + 1}</span>
                  <strong>{step.label}</strong>
                  <p>{step.caption}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="receipt-meta-grid">
            <article className="receipt-meta-card">
              <span>Date</span>
              <strong>{lastOrder.date}</strong>
            </article>
            <article className="receipt-meta-card">
              <span>Payment</span>
              <strong>{formatPaymentMethod(lastOrder.payment)}</strong>
            </article>
            <article className="receipt-meta-card">
              <span>Items</span>
              <strong>{totalItems}</strong>
            </article>
            <article className="receipt-meta-card">
              <span>Name</span>
              <strong>
                {lastOrder.checkoutDetails?.fullName ??
                  (lastOrder.customer
                    ? `${lastOrder.customer.firstName} ${lastOrder.customer.lastName}`
                    : "Saved customer")}
              </strong>
            </article>
            <article className="receipt-meta-card receipt-meta-card--wide">
              <span>Address</span>
              <strong>{lastOrder.checkoutDetails?.address ?? "No delivery address saved."}</strong>
            </article>
          </div>

          {lastOrder.appliedCoupon ? (
            <section className="receipt-note-card receipt-note-card--coupon">
              <h2>Coupon used</h2>
              <p>
                <strong>{lastOrder.appliedCoupon.code}</strong> - {lastOrder.appliedCoupon.title}
              </p>
              <p>{lastOrder.appliedCoupon.description}</p>
            </section>
          ) : null}

          <section className="receipt-items-panel">
            <div className="receipt-panel__header">
              <div>
                <p className="eyebrow">Order details</p>
                <h2>Your items</h2>
              </div>
              <p className="summary-note">A full breakdown of everything included in this order.</p>
            </div>

            <div className="receipt-line-list">
              {lastOrder.items.map((item) => (
                <article key={item.id} className="receipt-line-card">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="receipt-line-card__image"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="receipt-line-card__image receipt-line-card__image--placeholder">
                      BF
                    </div>
                  )}

                  <div className="receipt-line-card__copy">
                    <div className="receipt-line-card__top">
                      <strong>{item.name}</strong>
                      <span>x{item.quantity}</span>
                    </div>
                    {item.notes ? <p>{item.notes}</p> : <p>No special notes.</p>}
                  </div>

                  <strong className="receipt-line-card__total">
                    {formatCurrency(item.unitPrice * item.quantity, item.currency)}
                  </strong>
                </article>
              ))}
            </div>
          </section>

          <div className="receipt-breakdowns receipt-breakdowns--premium">
            {lastOrder.breakdowns.map((breakdown) => (
              <div key={breakdown.currency} className="summary-block summary-block--receipt">
                <p className="summary-block__title">{breakdown.currency} totals</p>
                <p>Subtotal: {formatCurrency(breakdown.subtotal, breakdown.currency)}</p>
                <p>Tax (5%): {formatCurrency(breakdown.tax, breakdown.currency)}</p>
                {breakdown.discount > 0 ? (
                  <p>Discount: -{formatCurrency(breakdown.discount, breakdown.currency)}</p>
                ) : null}
                <strong>Total: {formatCurrency(breakdown.total, breakdown.currency)}</strong>
              </div>
            ))}
          </div>

          <section className="receipt-note-card">
            <h2>Keep this copy for your records</h2>
            <p>
              You can download the premium PDF receipt now or come back to the
              home page and continue browsing the Bell Fresh menu.
            </p>
          </section>
        </div>

        <div className="receipt-actions">
          <button type="button" className="ghost-button" onClick={handleDownloadReceipt}>
            {isDownloading ? "Preparing PDF..." : "Download PDF Receipt"}
          </button>
          <button type="button" className="cta-link" onClick={handleBackHome}>
            Back to Home
          </button>
        </div>
      </div>
    </section>
  );
}

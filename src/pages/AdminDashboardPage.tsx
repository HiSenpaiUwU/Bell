import { FormEvent, useMemo, useState } from "react";
import { milkTeaProducts, saladProducts, snackProducts } from "../data/menuData";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContextFixed";
import { useCommunity } from "../context/CommunityContext";
import { useNotifications } from "../context/NotificationContext";
import { useRewards } from "../context/RewardsContext";
import {
  getOrdersPerDay,
  getOrdersToday,
  getRevenueByCurrency,
} from "../utils/adminAnalytics";
import { formatCurrency, formatPaymentMethod } from "../utils/format";
import { navigateTo } from "../utils/navigation";
import { getPopularProduct } from "../utils/recommendations";

function formatDate(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
}

function formatRevenueSummary(revenueEntries: Array<{ currency: string; total: number }>) {
  if (revenueEntries.length === 0) {
    return "No live revenue yet";
  }

  return revenueEntries
    .map((entry) => formatCurrency(entry.total, entry.currency as "USD" | "PHP"))
    .join(" + ");
}

export function AdminDashboardPage() {
  const {
    approvePasswordReset,
    currentUser,
    passwordResetRequests,
    rejectPasswordReset,
    removeUser,
    users,
  } = useAuth();
  const { deleteOrder, orderHistory } = useCart();
  const { createPost, posts, removePost, sendMessage } = useCommunity();
  const { notify } = useNotifications();
  const { couponTemplates, getUserCoupons, grantCouponToUser } = useRewards();
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementEmoji, setAnnouncementEmoji] = useState("📢");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [adminMessage, setAdminMessage] = useState("");

  const customerUsers = useMemo(
    () => users.filter((user) => user.role === "customer"),
    [users],
  );
  const pendingResetRequests = useMemo(
    () => passwordResetRequests.filter((request) => request.status === "pending"),
    [passwordResetRequests],
  );
  const activeCouponCount = useMemo(
    () =>
      customerUsers.reduce((sum, user) => {
        const activeCoupons = getUserCoupons(user.id).filter(
          (coupon) => coupon.status === "active",
        );
        return sum + activeCoupons.length;
      }, 0),
    [customerUsers, getUserCoupons],
  );
  const adminGiftCoupons = couponTemplates.filter(
    (coupon) => coupon.id === "tea-time-treat" || coupon.id === "vip-any-order",
  );
  const ordersToday = useMemo(() => getOrdersToday(orderHistory), [orderHistory]);
  const revenueEntries = useMemo(() => getRevenueByCurrency(orderHistory), [orderHistory]);
  const revenueTodayEntries = useMemo(
    () => getRevenueByCurrency(ordersToday),
    [ordersToday],
  );
  const ordersPerDay = useMemo(() => getOrdersPerDay(orderHistory), [orderHistory]);
  const popularProduct = useMemo(() => getPopularProduct(orderHistory), [orderHistory]);
  const maxDailyOrders = Math.max(...ordersPerDay.map((entry) => entry.count), 1);
  const livePulseProducts = [...saladProducts, ...milkTeaProducts, ...snackProducts]
    .filter((product) => product.liveOrdersLastHour)
    .sort(
      (leftProduct, rightProduct) =>
        (rightProduct.liveOrdersLastHour ?? 0) - (leftProduct.liveOrdersLastHour ?? 0),
    )
    .slice(0, 3);
  const featuredCommunityPosts = posts.slice(0, 5);
  const selectedCustomerId = selectedUserId || customerUsers[0]?.id || "";

  const handleNotifyResult = (
    title: string,
    result: { success: boolean; message: string },
  ) => {
    notify({
      title,
      message: result.message,
      tone: result.success ? "success" : "warning",
    });
  };

  const handlePostAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    handleNotifyResult(
      "Announcement posted",
      createPost(announcementText, {
        emoji: announcementEmoji,
        kind: "news",
        source: "Bell Fresh Admin",
        isAnnouncement: true,
      }),
    );

    setAnnouncementText("");
    setAnnouncementEmoji("📢");
  };

  const handleSendAdminMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCustomerId) {
      handleNotifyResult("Message not sent", {
        success: false,
        message: "Choose a customer first.",
      });
      return;
    }

    const result = sendMessage(selectedCustomerId, adminMessage);
    handleNotifyResult("Message sent", result);

    if (result.success) {
      setAdminMessage("");
    }
  };

  const handleOpenSelectedChat = () => {
    if (!selectedCustomerId) {
      handleNotifyResult("Chat not opened", {
        success: false,
        message: "Choose a customer first.",
      });
      return;
    }

    navigateTo("/chat", {
      state: { selectedUserId: selectedCustomerId },
    });
  };

  return (
    <section className="shell section-stack admin-page page-reveal">
      <section className="admin-hero admin-hero--expanded">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>Bell Fresh analytics and live controls</h1>
          <p className="section-copy">
            Track orders, revenue, item demand, customer accounts, rewards, and support
            actions from one private admin screen with a more realistic business feel.
          </p>
        </div>

        <div className="admin-hero__badge">
          <span>Signed in as</span>
          <strong>
            {currentUser?.firstName} {currentUser?.lastName}
          </strong>
          <small>{currentUser?.email}</small>
        </div>
      </section>

      <section className="admin-summary-grid admin-summary-grid--expanded">
        <article className="summary-card admin-summary-card">
          <p className="eyebrow">Orders today</p>
          <h2>{ordersToday.length}</h2>
          <p>Completed orders captured from today's local activity.</p>
        </article>
        <article className="summary-card admin-summary-card">
          <p className="eyebrow">Revenue today</p>
          <h2>{formatRevenueSummary(revenueTodayEntries)}</h2>
          <p>Live totals pulled from today's order breakdowns.</p>
        </article>
        <article className="summary-card admin-summary-card">
          <p className="eyebrow">Most popular item</p>
          <h2>{popularProduct?.name ?? "Chocomalt Cream Puff Red Milk Tea"}</h2>
          <p>Based on saved order frequency with a fallback demo best seller.</p>
        </article>
        <article className="summary-card admin-summary-card">
          <p className="eyebrow">Customers</p>
          <h2>{customerUsers.length}</h2>
          <p>Registered customer profiles saved in local storage.</p>
        </article>
      </section>

      <section className="admin-analytics-grid">
        <article className="summary-card admin-analytics-card">
          <div className="admin-panel__header">
            <div>
              <p className="eyebrow">Orders per day</p>
              <h2>7-day order graph</h2>
            </div>
            <span className="experience-count">System thinking</span>
          </div>

          <div className="admin-chart">
            {ordersPerDay.map((entry) => (
              <article key={entry.label} className="admin-chart__bar-group">
                <span
                  className="admin-chart__bar"
                  style={{ height: `${Math.max(16, (entry.count / maxDailyOrders) * 100)}%` }}
                />
                <strong>{entry.count}</strong>
                <small>{entry.label}</small>
              </article>
            ))}
          </div>
        </article>

        <article className="summary-card admin-analytics-card">
          <div className="admin-panel__header">
            <div>
              <p className="eyebrow">Live commerce pulse</p>
              <h2>Fake real-time demand</h2>
            </div>
            <span className="experience-count">Live feel</span>
          </div>

          <div className="admin-live-feed">
            {livePulseProducts.map((product) => (
              <article key={product.id} className="admin-live-feed__item">
                <strong>{`\uD83D\uDD25 ${product.liveOrdersLastHour} people ordered ${product.name} in the last hour`}</strong>
                <p>{product.nutritionTags?.join(" • ") ?? "Crowd favorite item"}</p>
              </article>
            ))}
          </div>

          <div className="admin-revenue-pill-row">
            <span className="coupon-history__pill">{`Revenue: ${formatRevenueSummary(revenueEntries)}`}</span>
            <span className="coupon-history__pill">{`${activeCouponCount} active coupons`}</span>
            <span className="coupon-history__pill">{`${pendingResetRequests.length} reset requests`}</span>
          </div>
        </article>
      </section>

      <section className="admin-panel-grid admin-panel-grid--stacked">
        <article className="summary-card admin-panel admin-panel--requests">
          <div className="admin-panel__header">
            <div>
              <p className="eyebrow">Password requests</p>
              <h2>Forgot password review queue</h2>
            </div>
            <p className="summary-note">
              Customer reset requests stay local to this browser and can be approved or rejected here.
            </p>
          </div>

          {pendingResetRequests.length === 0 ? (
            <p className="summary-note">No pending reset requests right now.</p>
          ) : (
            <div className="admin-request-list">
              {pendingResetRequests.map((request) => (
                <article key={request.id} className="admin-request-card">
                  <div>
                    <h3>@{request.username}</h3>
                    <p>{request.email}</p>
                  </div>

                  <div className="admin-request-card__meta">
                    <p>
                      <strong>Requested password:</strong> {request.requestedPassword}
                    </p>
                    <p>
                      <strong>Note:</strong> {request.note ?? "No extra note provided."}
                    </p>
                    <p>
                      <strong>Requested:</strong> {formatDate(request.createdAt)}
                    </p>
                  </div>

                  <div className="admin-action-row">
                    <button
                      type="button"
                      className="cta-link cta-link--soft"
                      onClick={() =>
                        handleNotifyResult(
                          "Password updated",
                          approvePasswordReset(request.id),
                        )
                      }
                    >
                      Approve reset
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        handleNotifyResult(
                          "Reset request closed",
                          rejectPasswordReset(request.id),
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="summary-card admin-panel admin-panel--users">
          <div className="admin-panel__header">
            <div>
              <p className="eyebrow">Customer profiles</p>
              <h2>Saved account data and actions</h2>
            </div>
            <p className="summary-note">
              This is still local demo data, including stored passwords, so it should not be treated as a real production security model.
            </p>
          </div>

          <div className="admin-user-list">
            {customerUsers.length === 0 ? (
              <p className="summary-note">No customer accounts have been registered yet.</p>
            ) : (
              customerUsers.map((user) => {
                const userCoupons = getUserCoupons(user.id);
                const activeCoupons = userCoupons.filter((coupon) => coupon.status === "active");
                const usedCoupons = userCoupons.filter((coupon) => coupon.status === "used");
                const pendingForUser = pendingResetRequests.filter(
                  (request) => request.userId === user.id,
                ).length;

                return (
                  <article key={user.id} className="admin-user-card admin-user-card--expanded">
                    <div className="admin-user-card__header">
                      <div>
                        <h3>
                          {`${user.favoriteEmoji ?? "👤"} ${user.firstName} ${user.lastName}`}
                        </h3>
                        <p>@{user.username}</p>
                      </div>
                      <span className="admin-role-badge">{user.role}</span>
                    </div>

                    <div className="admin-user-card__meta">
                      <p>
                        <strong>Email:</strong> {user.email}
                      </p>
                      <p>
                        <strong>Phone:</strong> {user.phone}
                      </p>
                      <p>
                        <strong>Password:</strong> {user.password}
                      </p>
                      <p>
                        <strong>GitHub:</strong>{" "}
                        {user.github ? (
                          <a href={user.github} target="_blank" rel="noreferrer">
                            {user.github}
                          </a>
                        ) : (
                          "Not provided"
                        )}
                      </p>
                      <p>
                        <strong>Google:</strong> {user.socialLinks?.googleEmail ?? "Not linked"}
                      </p>
                      <p>
                        <strong>Facebook:</strong>{" "}
                        {user.socialLinks?.facebook ? (
                          <a href={user.socialLinks.facebook} target="_blank" rel="noreferrer">
                            {user.socialLinks.facebook}
                          </a>
                        ) : (
                          "Not linked"
                        )}
                      </p>
                      <p>
                        <strong>Saved address:</strong>{" "}
                        {user.savedCheckoutDetails?.address ?? "No default address saved yet"}
                      </p>
                      <p>
                        <strong>Created:</strong> {formatDate(user.createdAt)}
                      </p>
                    </div>

                    <div className="admin-user-card__stats">
                      <span>{activeCoupons.length} active coupons</span>
                      <span>{usedCoupons.length} used coupons</span>
                      <span>{pendingForUser} pending reset requests</span>
                    </div>

                    <div className="admin-action-row admin-action-row--wrap">
                      {adminGiftCoupons.map((coupon) => (
                        <button
                          key={`${user.id}-${coupon.id}`}
                          type="button"
                          className="cta-link cta-link--soft"
                          onClick={() =>
                            handleNotifyResult(
                              "Coupon added",
                              grantCouponToUser(user.id, coupon.id, "Admin reward"),
                            )
                          }
                        >
                          Give {coupon.code}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          handleNotifyResult(
                            "Message sent",
                            sendMessage(
                              user.id,
                              `Hi ${user.firstName}! Your Bell Fresh account is active and ready. 💚`,
                            ),
                          )
                        }
                      >
                        Send hello
                      </button>
                      <button
                        type="button"
                        className="ghost-button ghost-button--danger"
                        onClick={() =>
                          handleNotifyResult(
                            "Account removed",
                            removeUser(user.id),
                          )
                        }
                      >
                        Remove account
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </article>

        <article className="summary-card admin-panel">
          <div className="admin-panel__header">
            <div>
              <p className="eyebrow">Community controls</p>
              <h2>Send messages and post live news</h2>
            </div>
            <p className="summary-note">
              Use these controls to message customers directly or publish live Bell Fresh updates.
            </p>
          </div>

          <form className="community-admin-form" onSubmit={handleSendAdminMessage}>
            <label>
              <span>Message customer</span>
              <select
                value={selectedCustomerId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                {customerUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.firstName} ${user.lastName} (@${user.username})`}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Admin message</span>
              <textarea
                value={adminMessage}
                onChange={(event) => setAdminMessage(event.target.value)}
                placeholder="Send a quick status update, welcome note, or delivery reminder."
              />
            </label>

            <div className="admin-action-row admin-action-row--wrap">
              <button type="submit" className="cta-link cta-link--soft">
                Send direct message
              </button>
              <button type="button" className="ghost-button" onClick={handleOpenSelectedChat}>
                Open chat thread
              </button>
            </div>
          </form>

          <form className="community-admin-form" onSubmit={handlePostAnnouncement}>
            <label>
              <span>Announcement emoji</span>
              <input
                type="text"
                value={announcementEmoji}
                onChange={(event) => setAnnouncementEmoji(event.target.value)}
                placeholder="📢"
                maxLength={4}
              />
            </label>

            <label>
              <span>Live announcement</span>
              <textarea
                value={announcementText}
                onChange={(event) => setAnnouncementText(event.target.value)}
                placeholder="Share a Bell Fresh update for everyone in the feed."
              />
            </label>

            <button type="submit" className="cta-link">
              Post to news feed
            </button>
          </form>
        </article>

        <article className="summary-card admin-panel">
          <div className="admin-panel__header">
            <div>
              <p className="eyebrow">Feed moderation</p>
              <h2>Recent community posts</h2>
            </div>
            <p className="summary-note">
              Remove outdated or unwanted posts to keep the Bell Fresh feed clean.
            </p>
          </div>

          <div className="admin-live-feed">
            {featuredCommunityPosts.length === 0 ? (
              <p className="summary-note">No feed posts yet.</p>
            ) : (
              featuredCommunityPosts.map((post) => (
                <article key={post.id} className="admin-live-feed__item">
                  <strong>{`${post.emoji ?? "📰"} ${post.content}`}</strong>
                  <p>{`Likes: ${post.likedBy.length} • ${formatDate(post.createdAt)}`}</p>
                  <div className="admin-action-row">
                    <button
                      type="button"
                      className="ghost-button ghost-button--danger"
                      onClick={() =>
                        handleNotifyResult(
                          "Post removed",
                          removePost(post.id),
                        )
                      }
                    >
                      Remove post
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="summary-card admin-panel admin-panel--orders">
          <div className="admin-panel__header">
            <div>
              <p className="eyebrow">Order history</p>
              <h2>Saved customer orders</h2>
            </div>
            <p className="summary-note">
              Orders stay linked to the customer profile snapshot captured at checkout time.
            </p>
          </div>

          <div className="admin-order-list">
            {orderHistory.length === 0 ? (
              <p className="summary-note">No orders have been placed yet.</p>
            ) : (
              orderHistory.map((order) => (
                <article key={order.orderNumber} className="admin-order-card admin-order-card--expanded">
                  <div className="admin-order-card__header">
                    <div>
                      <h3>{order.orderNumber}</h3>
                      <p>{formatDate(order.date)}</p>
                    </div>
                    <span className="admin-order-card__payment">
                      {formatPaymentMethod(order.payment)}
                    </span>
                  </div>

                  <div className="admin-order-card__customer">
                    <p>
                      <strong>Customer:</strong>{" "}
                      {order.checkoutDetails?.fullName ??
                        (order.customer
                          ? `${order.customer.firstName} ${order.customer.lastName}`
                          : "Legacy order")}
                    </p>
                    {order.customer ? (
                      <>
                        <p>
                          <strong>Username:</strong> {order.customer.username}
                        </p>
                        <p>
                          <strong>Email:</strong> {order.customer.email}
                        </p>
                        <p>
                          <strong>Phone:</strong> {order.customer.phone}
                        </p>
                      </>
                    ) : null}
                    {order.checkoutDetails?.address ? (
                      <p>
                        <strong>Address:</strong> {order.checkoutDetails.address}
                      </p>
                    ) : null}
                    {order.appliedCoupon ? (
                      <p>
                        <strong>Coupon used:</strong> {order.appliedCoupon.code} - {order.appliedCoupon.title}
                      </p>
                    ) : null}
                  </div>

                  <div className="admin-order-card__items">
                    {order.items.map((item) => (
                      <div key={item.id} className="admin-order-line">
                        <span>
                          {item.name} x{item.quantity}
                        </span>
                        <strong>{formatCurrency(item.unitPrice * item.quantity, item.currency)}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="admin-order-card__totals">
                    {order.breakdowns.map((breakdown) => (
                      <div key={`${order.orderNumber}-${breakdown.currency}`} className="summary-block">
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

                  <div className="admin-action-row">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => deleteOrder(order.orderNumber)}
                    >
                      Remove order record
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </section>
    </section>
  );
}

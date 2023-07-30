# Payment Processing
We use Recurly as the main platform API for managing billing.
This allows us to abstract away the individual APIs for Stripe, Authorize.net, and Paypal. And if we every lose a payment processor, we can easily switch to another one without refactoring our code.


## Overview
As a high level overview, here is how customer/merchant/subscription logic is handled in Milkshake:

- Every user is a customer
- Every user is a pseudo-merchant, which means they each have their own $0 plan representing themselves
- When a user buys from a pseudo-merchant, they get a subscription to that merchants plan.
- Every wish is a recurly Item with no price (simply a 1:1 relationship to Wish, so that we can get sales analytics from Recurly). Whenever a customer buys a wish, they add that wish as a subscription add-on to their subscription (allows custom amounts), or as a one-time charge (allows custom amounts)
- Recurring wishes are ALSO a plan add-on for the pseudo-merchant's plan. Customers can add this add-on to their subscription, or as a one-time charge.
- Customers are billed a single invoice each month that shows all their subscriptions and subscription add-ons. This allows them to see where their money is going.
- When a customer buys a wish, we immediately charge their card for the pro-rated amount until their next billing cycle.
- On their next billing cycle they will be charged the full amount for all their subscription wishes.
- PurchaseManifest contains truth info about who bought what when. This is only used internally. Recurly does not have this concept. If a user unsubs from a psuedo-merchant, they first unsub from PurchaseManifest, and then the PurchaseManifest will unsub from Recurly.


# Base Assets
At the base minimum, Milkshake requires the following Recurly assets to be created:
- `main-billing-cycle` plan at $0 and 120 month free trial
- `main-billing-cycle: premium-chat` add-on at $3.86 per month


## Workflow
When a new user is created, the following happens:

1. Create new Recurly account for this customer
2. Subscribe them to the `main-billing-cycle` plan free trial $0/month
3. Create a new Recurly plan at $0 and 120 month free trial to represent this user as a merchant (wish list)

```ts
interface User_Firestore {
  id: UserID;
  recurlyMetadata: RecurlyMetadata_UserFirestore
}
export interface RecurlyMetadata_UserFirestore {
  recurlyCustomerAccountID: RecurlyCustomerAccountID;
  recurlyCustomerAccountCode: RecurlyCustomerAccountCode;
  recurlyCreatorPlanID: RecurlyPlanID;
}
```

Whenever a user creates a wish, we have to make a recurly Item. It won't have a price, but it will allow us to get sales analytics from Recurly.


4. Create a new Recurly Item for this wish with no price.

```ts
interface Wish_Firestore {
  id: WishID;
  recurlyItemID?: RecurlyItemID;
  recurlyPlanAddOnID?: RecurlyPlanAddOnID;
  RecurlyPlanAddOnCode?: RecurlyPlanAddOnCode;
}
```

Whenever a user begins a friendship with another user, we do not need to do anything with Recurly. Only when they buy a wish from that user do we need to update their friendship with a Recurly subscription (if they dont already have one).

There should only be 1 subscriptionID on a friendship and it represents the POV where primaryUserID buys from friendID.

```ts
interface Friendship_Firestore {
  id: FriendshipID;
  primaryUserID: UserID;
  friendID: UserID;
  subscriptionID?: RecurlySubscriptionID; // POV as primaryUserID buys from friendID
}
```

When a user buys a wish from another user (pseudo-merchant), the following happens:

5. Create a sub add on derived from this wish (Item) to be added to the friendship.subscriptionID. or it could be a one-time charge.
6. Denote in the PurchaseManifest the purchase of this wish using its recurlyItemID, friendship.subscriptionID, and subAddOnID or recurly charge id.

```ts
export interface PurchaseMainfest_Firestore {
  id: PurchaseMainfestID;
  recurlySubscriptionID?: RecurlySubscriptionID;
  recurlySubscriptionAddOnID?: RecurlyPlanAddOnID;
  recurlyPlanAddOnID?: RecurlyPlanAddOnID;
  recurlyPlanAddOnCode?: RecurlyPlanAddOnCode;
  recurlyChargeID?: RecurlyChargeID;
}
```


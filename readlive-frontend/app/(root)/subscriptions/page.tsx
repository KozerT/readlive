import { PricingTable } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="clerk-subscriptions">
      <h1 className="page-title">Choose Your Plan</h1>
      <p className="page-description">
        Upgrade to read more books and talk to them for longer.
      </p>
      <div className="clerk-pricing-table-wrapper mt-12 w-full">
        <PricingTable />
      </div>
    </main>
  );
}

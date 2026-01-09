export const metadata = {
  title: "About Achievo",
};

export default function AboutPage() {
  const pillars = [
    {
      title: "Evidence First",
      body: "Every badge starts with verifiable work: goal CID, evidence CID, and on-chain verification level.",
    },
    {
      title: "Layered Trust",
      body: "Self attest, rally peers, or tap into trusted partners for AUTO verification with complete transparency.",
    },
    {
      title: "Soulbound Reputation",
      body: "Badges stick to wallets—no speculation, no farming, just proof of contribution across ecosystems.",
    },
  ];

  const flow = ["Define goal", "Submit evidence", "Self approve", "Peer approvals", "Mint badge"];

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold">About Achievo</h1>
        <p className="text-gray-600">
          Achievo is a proof-of-achievement layer for real work. Goals live on-chain with immutable verification states.
          Evidence stays accessible via IPFS, and badges are non-transferable so reputation cannot be bought.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="rounded-2xl border bg-white p-5 space-y-2">
            <h3 className="text-lg font-semibold">{pillar.title}</h3>
            <p className="text-sm text-gray-600">{pillar.body}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-xl font-semibold">Flow</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          {flow.map((step, idx) => (
            <>
              <span key={step} className="px-3 py-1 rounded-full bg-gray-100">
                {step}
              </span>
              {idx < flow.length - 1 && <span key={`${step}-arrow`}>→</span>}
            </>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold">Vision</h3>
        <p className="text-gray-600">
          We want anyone to prove the grind: devs finishing tracks, community leads shipping events, scholars completing
          cohorts, public goods teams hitting milestones. Achievo keeps verification light on gas, heavy on context.
        </p>
      </section>
    </div>
  );
}

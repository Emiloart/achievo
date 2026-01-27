import { PageHeader } from "../../components/nav/PageHeader";

export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="About"
        description="Achievo is a proof-of-achievement platform that anchors goals, evidence, and verifications on-chain with clear status and policy transparency."
      />
      <div className="max-w-3xl space-y-3 text-sm text-textMuted">
        <p>
          Achievo focuses on verifiable progress. Goals and evidence are anchored with immutable identifiers, while
          verification states remain explicit and auditable at every step.
        </p>
        <p>
          The product is designed to keep trust lightweight and readable: users can inspect provenance, validation
          status, and on-chain confirmations without ambiguity.
        </p>
      </div>
    </div>
  );
}

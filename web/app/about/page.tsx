import { PageHeader } from "../../components/nav/PageHeader";

export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="About"
        description="Achievo is a verifiable program and credential infrastructure for organizations, cohorts, and contributor networks."
      />
      <div className="max-w-3xl space-y-3 text-sm text-textMuted">
        <p>
          The core workflow is simple: organizations publish programs, participants submit evidence, reviewers attest
          outcomes, and Achievo turns that work into portable artifacts that can be exported and publicly verified.
        </p>
        <p>
          Trust states stay explicit at every step. Verification pages should distinguish missing, invalid, unknown,
          degraded, and verified states without forcing users to infer system truth from ambiguous UI.
        </p>
      </div>
    </div>
  );
}

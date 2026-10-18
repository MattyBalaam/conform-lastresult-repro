import { parseSubmission, report, useForm } from "@conform-to/react/future";
import { Suspense, startTransition, use, useState } from "react";

type Result = ReturnType<typeof report>;

// Suspends the first render it's part of, then never again. Used to make React
// discard the transition render that delivers `lastResult` — the same thing an
// urgent update interrupting the transition does, but deterministic.
let pending: Promise<void> | null = null;
function SuspendOnce() {
  if (pending) use(pending);
  return null;
}

export function App() {
  const [lastResult, setLastResult] = useState<Result>();
  const [suspend, setSuspend] = useState(true);

  const { form, fields } = useForm({
    lastResult,
    defaultValue: { message: "" },
    // No client validation — the "server" result below is all that matters.
    onValidate: () => undefined,
    onSubmit(event, { formData }) {
      event.preventDefault();

      // Stand-in for a server action: after a round trip, the server accepts
      // the value and asks for the form to be reset.
      setTimeout(() => {
        const result = report(parseSubmission(formData), { reset: true });

        if (suspend) {
          pending = new Promise<void>((resolve) => setTimeout(resolve, 300)).then(() => {
            pending = null;
          });
        }

        // Routers (e.g. React Router) commit action data inside a transition.
        startTransition(() => setLastResult(result));
      }, 500);
    },
  });

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 560, margin: "2rem auto" }}>
      <h1>Conform: lastResult lost when a render is discarded</h1>

      <label style={{ display: "block", marginBottom: "1rem" }}>
        <input
          type="checkbox"
          checked={suspend}
          onChange={(event) => setSuspend(event.target.checked)}
        />{" "}
        Discard the first render that receives <code>lastResult</code> (a sibling suspends once)
      </label>

      <form {...form.props}>
        <label htmlFor={fields.message.id}>Message</label>{" "}
        <input id={fields.message.id} name={fields.message.name} />{" "}
        <button type="submit">Submit</button>
        <Suspense fallback={null}>
          <SuspendOnce />
        </Suspense>
      </form>

      <p>
        <code>lastResult</code> prop received by the component:{" "}
        <strong data-testid="received">{lastResult ? "yes" : "no"}</strong>
      </p>

      <p>
        <strong>Steps:</strong> type something, press Submit, wait a second.
        <br />
        <strong>Expected:</strong> the input is reset, with or without the checkbox ticked.
        <br />
        <strong>Actual:</strong> with the checkbox ticked, the component receives{" "}
        <code>lastResult</code> but the reset is never applied.
      </p>
    </main>
  );
}

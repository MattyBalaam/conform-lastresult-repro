# Conform: `lastResult` is lost when React discards a render

[Open in StackBlitz](https://stackblitz.com/github/MattyBalaam/conform-lastresult-repro)

`useForm` from `@conform-to/react/future` can silently drop a `lastResult`. It happens when React discards the render that first receives the result, for example because the render suspends or an urgent update interrupts a transition. The component gets the new `lastResult` prop, but Conform never applies it: no reset, no `targetValue` and no errors. Conform doesn't apply it on later renders either.

## Versions

- `@conform-to/react` 1.21.2 (also seen on 1.21.1)
- `react` / `react-dom` 19.3.0
- No `StrictMode`

## Steps to reproduce

1. `pnpm install && pnpm dev`, or open the StackBlitz link above.
2. Untick the checkbox, type something and press **Submit**. After about half a second the "server" result arrives with `reset: true` and the input clears. This is the expected behaviour.
3. Tick the checkbox, type something and press **Submit**. The result arrives ("received: yes"), but the input is never reset.

The checkbox makes a sibling inside the form suspend once during the transition render that delivers `lastResult`. That's a deterministic way to make React throw that render away and render again.

## Cause

In `dist/future/hooks.mjs` (`useConform`), the result is marked as handled and applied during render:

```js
} else if (lastResult && lastResult !== lastResultRef.current) {
  lastResultRef.current = lastResult;
  handleSubmission('server', lastResult, options); // calls setState
}
```

When React discards that render, it also discards the `setState` inside `handleSubmission`. The ref write persists, because refs aren't part of render state. When React renders again, `lastResult === lastResultRef.current`, so Conform never applies the result.

## Where this shows up in practice

React Router (v7) commits action data inside `startTransition`. When anything triggers an urgent update while that transition is rendering, React interrupts and restarts the render, and the action result can be lost. A toast fired from a `clientAction` just before it returns is one such update. We first saw this as a rare CI flake (about 1 in 250 runs locally with the CPU throttled 4×): an item added through a `clientAction` never appeared, and the add input kept its value.

## Possible fix

Keep the "last applied result" in state instead of a ref, using React's [storing information from previous renders](https://react.dev/reference/react/useState#storing-information-from-previous-renders) pattern. React then keeps or discards it together with the state update it guards. With this change applied to 1.21.2, both cases in this repro reset the input:

```js
const [appliedResult, setAppliedResult] = useState(lastResult);
if (lastResult && lastResult !== appliedResult) {
  setAppliedResult(lastResult);
  handleSubmission('server', lastResult, options);
}
```

`handleSubmission` also dispatches a DOM event (`dispatchInternalUpdateEvent`) during render. That side effect will repeat if React renders again, so it probably belongs in an effect.

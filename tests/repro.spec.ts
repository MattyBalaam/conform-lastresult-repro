import { expect, test, type Page } from "@playwright/test";

async function submit(page: Page, { discardRender }: { discardRender: boolean }) {
  await page.goto("/");
  await page.getByRole("checkbox").setChecked(discardRender);
  await page.getByLabel("Message").fill("hello");
  await page.getByRole("button", { name: "Submit" }).click();

  // The "server" result arrives after 500ms, inside a transition.
  await expect(page.getByTestId("received")).toHaveText("yes");
}

test("control: lastResult with reset: true resets the form", async ({ page }) => {
  await submit(page, { discardRender: false });

  await expect(page.getByLabel("Message")).toHaveValue("");
});

// Fails on @conform-to/react 1.21.2: the render that receives lastResult is
// discarded, and Conform never applies the result afterwards.
test("bug: lastResult is still applied after React discards a render", async ({ page }) => {
  await submit(page, { discardRender: true });

  await expect(page.getByLabel("Message")).toHaveValue("");
});

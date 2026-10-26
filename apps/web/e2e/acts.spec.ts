import { expect, test } from "@playwright/test";
import { saveAfterAct1, seedSave } from "./fixtures";

test("after Gorrak the road leads on: pick an act and set out", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAfterAct1());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const camp = page.getByRole("region", { name: "Camp" });
  await expect(camp).toContainText("Camp at the Rotwood");
  // The caravan camps in the Rotwood now: its own painted camp (lager-hintergruende-v1.md).
  await expect(camp.locator("svg.camp-scene")).toHaveAttribute("data-act", "2");
  const road = camp.getByRole("radiogroup", { name: "Road" });
  // Only the acts of this run: Acts 3 to 7 stay hidden until later Prestiges open them.
  await expect(road.getByRole("radio")).toHaveCount(2);
  await expect(camp).not.toContainText("Ember Wastes");
  // The Rotwood's boss keeps its name until the Heir meets it.
  await expect(camp).toContainText("Boss: ???");
  await expect(camp).not.toContainText("Mother of Rot");
  await expect(road.getByRole("radio", { name: /Rotwood/ })).toBeChecked();

  // Revisit Act 1: an old act of the run burns under one of two Omens, chosen at Eldrin.
  await road.getByRole("radio", { name: /Ashen Fields/ }).click();
  await camp.getByRole("button", { name: "CHOOSE AN OMEN" }).click();
  const trip = page.getByRole("region", { name: "Eldrin, The Road" });
  await expect(trip.getByRole("button", { name: "CHOOSE AN OMEN" })).toBeDisabled();
  // Each act has its Home Rune (act-beute-entwurf-v1.md): Bark in the Ashen Fields.
  await expect(trip.getByTestId("home-rune")).toContainText("Bark");
  const omens = trip.getByRole("radiogroup", { name: "Omen" });
  await expect(omens.getByRole("radio")).toHaveCount(2);
  await omens.getByRole("radio").first().click();
  await expect(trip.getByRole("button", { name: /SET OUT · ACT 1/i })).toBeEnabled();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/omen-choice.png` });
  // The newest act has no Omen: go on to the Rotwood.
  await trip.getByRole("radio", { name: /Rotwood/ }).click();
  await expect(trip.getByRole("radiogroup", { name: "Omen" })).toHaveCount(0);
  await expect(trip.getByTestId("home-rune")).toContainText("Thorn");
  await trip.getByTestId("home-rune").hover();
  await expect(
    page.getByText("In Rotwood, 1 in 5 Runes is Thorn.", { exact: false }),
  ).toBeVisible();
  await trip.getByRole("button", { name: /SET OUT · ACT 2/i }).click();
  await expect(page.getByRole("region", { name: "Intermission" })).toContainText("Rotwood");
  expect(errors).toEqual([]);
});

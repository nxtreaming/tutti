import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./BrowserElementContextAction.tsx", import.meta.url),
  "utf8"
);

test("browser element selection action uses a shared hover tooltip", () => {
  assert.match(
    source,
    /<TooltipTrigger asChild>[\s\S]*?<Button[\s\S]*?<TooltipContent side="bottom">\{label\}<\/TooltipContent>/
  );
});

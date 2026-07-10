import assert from "node:assert/strict";
import test from "node:test";
import {
  renderProviderIdentityCatalog,
  validateRegistryCatalog
} from "./generate-agent-gui-provider-catalog.mjs";

const catalog = [
  {
    providerId: "example",
    displayName: "Example",
    iconKey: "example-icon",
    localeKey: "example",
    aliases: ["example-alias"],
    target: {
      id: "local:example",
      launchRefType: "local_cli",
      enabled: true,
      sortOrder: 20
    }
  }
];

test("renders every registry identity and target field", async () => {
  const source = await renderProviderIdentityCatalog(catalog);

  assert.match(source, /providerId: "example"/u);
  assert.match(source, /iconKey: "example-icon"/u);
  assert.match(source, /localeKey: "example"/u);
  assert.match(source, /id: "local:example"/u);
  assert.match(source, /launchRefType: "local_cli"/u);
});

test("rejects duplicate target ids before generating", () => {
  assert.throws(
    () =>
      validateRegistryCatalog([
        ...catalog,
        {
          ...catalog[0],
          providerId: "another-example",
          iconKey: "another-example"
        }
      ]),
    /duplicate target id/u
  );
});

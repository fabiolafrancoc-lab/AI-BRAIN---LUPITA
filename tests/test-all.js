const assert = require("assert");
const axios = require("axios");
const { app } = require("../src/index.js");

const run = async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const health = await axios.get(`${baseUrl}/health`);
    assert.strictEqual(health.status, 200, "Health endpoint should return 200");
    assert.strictEqual(health.data.status, "ok", "Health status should be ok");
    assert.strictEqual(health.data.service, "lupita-ai", "Service name should match");

    const root = await axios.get(`${baseUrl}/`);
    assert.strictEqual(root.status, 200, "Root endpoint should return 200");
    assert.ok(root.data.message.includes("Lupita"), "Root message should mention Lupita");

    console.log("All tests passed.");
  } finally {
    server.close();
  }
};

run().catch((error) => {
  console.error("Tests failed.");
  console.error(error);
  process.exit(1);
});

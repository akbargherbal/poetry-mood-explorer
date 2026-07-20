import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.js"],
    // app.js has a module-level `document.addEventListener("DOMContentLoaded", ...)`
    // for its init routine. That line needs `document` to exist just to be
    // imported, even though the functions under test here are themselves
    // DOM-free. jsdom's document is already past "DOMContentLoaded" by the
    // time the module is imported in a test, so that listener never fires
    // and none of the app's init/fetch side effects run.
    environment: "jsdom",
  },
});

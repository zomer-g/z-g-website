import { test } from "node:test";
import assert from "node:assert/strict";
import { youtubeId } from "../../src/lib/youtube";

test("youtubeId reads the common YouTube link shapes", () => {
  for (const u of [
    "https://www.youtube.com/watch?v=UpNN2P8vLpw",
    "https://m.youtube.com/watch?v=UpNN2P8vLpw&t=60",
    "https://youtu.be/UpNN2P8vLpw?t=3",
    "https://www.youtube.com/embed/UpNN2P8vLpw",
    "https://www.youtube.com/shorts/UpNN2P8vLpw",
    "https://www.youtube.com/live/UpNN2P8vLpw",
  ]) {
    assert.equal(youtubeId(u), "UpNN2P8vLpw", u);
  }
});

test("youtubeId rejects other hosts and malformed ids", () => {
  for (const u of [
    "https://evil.com/watch?v=UpNN2P8vLpw",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch?v=UpNN2P8vLpw%22onload",
    "javascript:alert(1)",
    "not a url",
    "",
    null,
    undefined,
  ]) {
    assert.equal(youtubeId(u), null, String(u));
  }
});

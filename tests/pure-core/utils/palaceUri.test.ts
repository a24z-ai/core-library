import { describe, test, expect } from "bun:test";
import {
  parsePalaceUri,
  buildPalaceUri,
  createCrossPalaceReference,
  buildLocalPalaceUri,
  buildGitHubPalaceUri,
  isPalaceUri,
  extractRepositoryFromUri,
} from "../../../src/pure-core/utils/palaceUri";

describe("Palace URI Utilities", () => {
  describe("parsePalaceUri", () => {
    test("should parse local palace URI", () => {
      const uri = "palace://local/room/room-123";
      const parsed = parsePalaceUri(uri);

      expect(parsed).toBeTruthy();
      expect(parsed?.protocol).toBe("palace");
      expect(parsed?.host).toBe("local");
      expect(parsed?.resourceType).toBe("room");
      expect(parsed?.resourceId).toBe("room-123");
    });

    test("should parse absolute path palace URI", () => {
      const uri = "palace:///Users/test/repo/view/view-abc";
      const parsed = parsePalaceUri(uri);

      expect(parsed).toBeTruthy();
      expect(parsed?.host).toBe("/Users/test/repo"); // Absolute path is preserved
      expect(parsed?.resourceType).toBe("view");
      expect(parsed?.resourceId).toBe("view-abc");
    });

    test("should parse GitHub palace URI", () => {
      const uri = "palace://github.com/user/repo/note/note-xyz";
      const parsed = parsePalaceUri(uri);

      expect(parsed).toBeTruthy();
      expect(parsed?.host).toBe("github.com/user/repo");
      expect(parsed?.resourceType).toBe("note");
      expect(parsed?.resourceId).toBe("note-xyz");
    });

    test("should parse URI with query parameters", () => {
      const uri =
        "palace://github.com/user/repo/drawing/draw-1?branch=main&version=2";
      const parsed = parsePalaceUri(uri);

      expect(parsed).toBeTruthy();
      expect(parsed?.resourceId).toBe("draw-1");
      expect(parsed?.query).toEqual({
        branch: "main",
        version: "2",
      });
    });

    test("should parse URI with fragment", () => {
      const uri = "palace://local/note/note-1#section-2";
      const parsed = parsePalaceUri(uri);

      expect(parsed).toBeTruthy();
      expect(parsed?.resourceId).toBe("note-1");
      expect(parsed?.fragment).toBe("section-2");
    });

    test("should parse URI with query and fragment", () => {
      const uri = "palace://local/view/view-1?filter=active#cell-3";
      const parsed = parsePalaceUri(uri);

      expect(parsed).toBeTruthy();
      expect(parsed?.resourceId).toBe("view-1");
      expect(parsed?.query).toEqual({ filter: "active" });
      expect(parsed?.fragment).toBe("cell-3");
    });

    test("should return null for invalid URI", () => {
      expect(parsePalaceUri("http://example.com")).toBeNull();
      expect(parsePalaceUri("palace://")).toBeNull();
      expect(parsePalaceUri("palace://host")).toBeNull();
      expect(parsePalaceUri("not-a-uri")).toBeNull();
    });

    test("should return null for invalid resource type", () => {
      const uri = "palace://local/invalid/resource-1";
      const parsed = parsePalaceUri(uri);
      expect(parsed).toBeNull();
    });
  });

  describe("buildPalaceUri", () => {
    test("should build simple palace URI", () => {
      const uri = buildPalaceUri({
        host: "local",
        resourceType: "room",
        resourceId: "room-123",
      });

      expect(uri).toBe("palace://local/room/room-123");
    });

    test("should build URI with query parameters", () => {
      const uri = buildPalaceUri({
        host: "github.com/user/repo",
        resourceType: "view",
        resourceId: "view-1",
        query: {
          branch: "develop",
          tag: "v1.0",
        },
      });

      expect(uri).toBe(
        "palace://github.com/user/repo/view/view-1?branch=develop&tag=v1.0",
      );
    });

    test("should build URI with fragment", () => {
      const uri = buildPalaceUri({
        host: "local",
        resourceType: "note",
        resourceId: "note-1",
        fragment: "paragraph-5",
      });

      expect(uri).toBe("palace://local/note/note-1#paragraph-5");
    });

    test("should build URI with both query and fragment", () => {
      const uri = buildPalaceUri({
        host: "local",
        resourceType: "drawing",
        resourceId: "draw-1",
        query: { version: "2" },
        fragment: "layer-3",
      });

      expect(uri).toBe("palace://local/drawing/draw-1?version=2#layer-3");
    });
  });

  describe("createCrossPalaceReference", () => {
    test("should create reference for valid URI", () => {
      const uri = "palace://github.com/user/repo/room/room-1";
      const ref = createCrossPalaceReference(uri);

      expect(ref.uri).toBe(uri);
      expect(ref.status).toBe("pending");
      expect(ref.parsed).toBeTruthy();
      expect(ref.error).toBeUndefined();
    });

    test("should create broken reference for invalid URI", () => {
      const uri = "invalid://uri";
      const ref = createCrossPalaceReference(uri);

      expect(ref.uri).toBe(uri);
      expect(ref.status).toBe("broken");
      expect(ref.parsed).toBeUndefined();
      expect(ref.error).toBe("Invalid Palace URI format");
    });
  });

  describe("buildLocalPalaceUri", () => {
    test("should build URI for local repository", () => {
      const uri = buildLocalPalaceUri("/Users/test/repo", "room", "room-1");
      expect(uri).toBe("palace:///Users/test/repo/room/room-1");
    });

    test("should handle relative path", () => {
      const uri = buildLocalPalaceUri("my-repo", "view", "view-1");
      expect(uri).toBe("palace://local/my-repo/view/view-1");
    });
  });

  describe("buildGitHubPalaceUri", () => {
    test("should build GitHub URI without branch", () => {
      const uri = buildGitHubPalaceUri("user", "repo", "note", "note-1");
      expect(uri).toBe("palace://github.com/user/repo/note/note-1");
    });

    test("should build GitHub URI with branch", () => {
      const uri = buildGitHubPalaceUri(
        "user",
        "repo",
        "drawing",
        "draw-1",
        "develop",
      );
      expect(uri).toBe(
        "palace://github.com/user/repo/drawing/draw-1?branch=develop",
      );
    });
  });

  describe("isPalaceUri", () => {
    test("should identify palace URIs", () => {
      expect(isPalaceUri("palace://local/room/room-1")).toBe(true);
      expect(isPalaceUri("palace://github.com/user/repo/view/view-1")).toBe(
        true,
      );
      expect(isPalaceUri("http://example.com")).toBe(false);
      expect(isPalaceUri("file:///path/to/file")).toBe(false);
      expect(isPalaceUri("not-a-uri")).toBe(false);
    });
  });

  describe("extractRepositoryFromUri", () => {
    test("should extract GitHub repository info", () => {
      const parsed = parsePalaceUri(
        "palace://github.com/owner/repo/room/room-1?branch=main",
      );
      const info = extractRepositoryFromUri(parsed!);

      expect(info.type).toBe("github");
      expect(info.owner).toBe("owner");
      expect(info.repo).toBe("repo");
      expect(info.branch).toBe("main");
    });

    test("should extract local absolute path", () => {
      const parsed = parsePalaceUri("palace:///Users/test/repo/view/view-1");
      const info = extractRepositoryFromUri(parsed!);

      expect(info.type).toBe("local");
      expect(info.path).toBe("/Users/test/repo");
    });

    test("should extract explicit local path", () => {
      const parsed = parsePalaceUri("palace://local/my-repo/note/note-1");
      const info = extractRepositoryFromUri(parsed!);

      expect(info.type).toBe("local");
      expect(info.path).toBe("my-repo");
    });

    test("should handle other repository types", () => {
      const parsed = parsePalaceUri(
        "palace://gitlab.com/user/repo/drawing/draw-1",
      );
      const info = extractRepositoryFromUri(parsed!);

      expect(info.type).toBe("other");
      expect(info.path).toBe("gitlab.com/user/repo"); // This should now work correctly
    });

    test("should handle local without path", () => {
      const parsed = parsePalaceUri("palace://local/room/room-1");
      const info = extractRepositoryFromUri(parsed!);

      expect(info.type).toBe("local");
      expect(info.path).toBe(".");
    });
  });
});

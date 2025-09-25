import { describe, test, expect, beforeEach } from "bun:test";
import { PalaceRoomStore } from "../../../src/pure-core/stores/PalaceRoomStore";
import { InMemoryFileSystemAdapter } from "../../../src/test-adapters/InMemoryFileSystemAdapter";
import type { ValidatedAlexandriaPath } from "../../../src/pure-core/types/repository";
import type { CreatePortalOptions } from "../../../src/pure-core/types/palace-portal";

describe("PalaceRoomStore - Portal Management", () => {
  let fs: InMemoryFileSystemAdapter;
  let store: PalaceRoomStore;
  const alexandriaPath = "/test/repo/.alexandria" as ValidatedAlexandriaPath;
  let testRoomId: string;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    fs.createDir("/test");
    fs.createDir("/test/repo");
    fs.createDir(alexandriaPath);
    store = new PalaceRoomStore(fs, alexandriaPath);

    // Create a test room for portal operations
    const result = store.createRoom({ name: "Test Room" });
    if (!result.palaceRoom) {
      throw new Error("Failed to create test room");
    }
    testRoomId = result.palaceRoom.id;
  });

  describe("addPortalToRoom", () => {
    test("should add a portal to a room", () => {
      const portalOptions: CreatePortalOptions = {
        name: "External Palace",
        description: "Portal to another repository",
        target: {
          type: "local",
          path: "/other/repo",
        },
        referenceType: "full",
        displayMode: "linked",
      };

      const portal = store.addPortalToRoom(testRoomId, portalOptions);

      expect(portal).toBeTruthy();
      expect(portal?.name).toBe("External Palace");
      expect(portal?.description).toBe("Portal to another repository");
      expect(portal?.target.type).toBe("local");
      expect(portal?.target.path).toBe("/other/repo");
      expect(portal?.status).toBe("pending");
      expect(portal?.id).toBeTruthy();
      expect(portal?.createdAt).toBeTruthy();
    });

    test("should add portal to GitHub repository", () => {
      const portalOptions: CreatePortalOptions = {
        name: "GitHub Portal",
        target: {
          type: "git",
          gitUrl: "https://github.com/user/repo",
          branch: "main",
        },
        referenceType: "selective",
        references: {
          roomIds: ["room1", "room2"],
          notePatterns: ["api/*"],
        },
      };

      const portal = store.addPortalToRoom(testRoomId, portalOptions);

      expect(portal).toBeTruthy();
      expect(portal?.target.gitUrl).toBe("https://github.com/user/repo");
      expect(portal?.target.branch).toBe("main");
      expect(portal?.referenceType).toBe("selective");
      expect(portal?.references?.roomIds).toEqual(["room1", "room2"]);
      expect(portal?.references?.notePatterns).toEqual(["api/*"]);
    });

    test("should return null for non-existent room", () => {
      const portalOptions: CreatePortalOptions = {
        name: "Test Portal",
        target: { type: "local", path: "/path" },
      };

      const portal = store.addPortalToRoom("non-existent", portalOptions);
      expect(portal).toBeNull();
    });

    test("should initialize portals array for backward compatibility", () => {
      // Manually create a room without portals array
      const roomId = "legacy-room";
      const roomPath = fs.join(
        alexandriaPath,
        "palace-rooms",
        `${roomId}.json`,
      );
      const legacyRoom = {
        id: roomId,
        name: "Legacy Room",
        drawingIds: [],
        codebaseViewIds: [],
        noteIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // No portals array
      };
      fs.writeFile(roomPath, JSON.stringify(legacyRoom, null, 2));

      const portalOptions: CreatePortalOptions = {
        name: "Test Portal",
        target: { type: "local", path: "/path" },
      };

      const portal = store.addPortalToRoom(roomId, portalOptions);
      expect(portal).toBeTruthy();

      const room = store.getRoom(roomId);
      expect(room?.portals).toBeTruthy();
      expect(room?.portals?.length).toBe(1);
    });
  });

  describe("removePortalFromRoom", () => {
    test("should remove a portal from a room", () => {
      const portalOptions: CreatePortalOptions = {
        name: "Test Portal",
        target: { type: "local", path: "/path" },
      };

      const portal = store.addPortalToRoom(testRoomId, portalOptions);
      if (!portal) {
        throw new Error("Failed to add portal");
      }
      const portalId = portal.id;

      const removed = store.removePortalFromRoom(testRoomId, portalId);
      expect(removed).toBe(true);

      const room = store.getRoom(testRoomId);
      expect(room?.portals?.length).toBe(0);
    });

    test("should return false for non-existent portal", () => {
      const removed = store.removePortalFromRoom(testRoomId, "non-existent");
      expect(removed).toBe(false);
    });

    test("should return false for non-existent room", () => {
      const removed = store.removePortalFromRoom("non-existent", "portal-id");
      expect(removed).toBe(false);
    });
  });

  describe("updatePortalInRoom", () => {
    test("should update a portal in a room", () => {
      const portalOptions: CreatePortalOptions = {
        name: "Original Name",
        description: "Original description",
        target: { type: "local", path: "/original" },
      };

      const portal = store.addPortalToRoom(testRoomId, portalOptions);
      if (!portal) {
        throw new Error("Failed to add portal");
      }
      const portalId = portal.id;

      const updated = store.updatePortalInRoom(testRoomId, portalId, {
        name: "Updated Name",
        description: "Updated description",
        status: "active",
      });

      expect(updated).toBeTruthy();
      expect(updated?.name).toBe("Updated Name");
      expect(updated?.description).toBe("Updated description");
      expect(updated?.status).toBe("active");
      expect(updated?.target.path).toBe("/original"); // Target unchanged
      expect(updated?.id).toBe(portalId); // ID unchanged
      expect(updated?.createdAt).toBe(portal?.createdAt); // Creation time preserved
    });

    test("should return null for non-existent portal", () => {
      const updated = store.updatePortalInRoom(testRoomId, "non-existent", {
        name: "New Name",
      });
      expect(updated).toBeNull();
    });
  });

  describe("getPortalFromRoom", () => {
    test("should get a specific portal from a room", () => {
      const portalOptions: CreatePortalOptions = {
        name: "Test Portal",
        target: { type: "local", path: "/path" },
      };

      const portal = store.addPortalToRoom(testRoomId, portalOptions);
      if (!portal) {
        throw new Error("Failed to add portal");
      }
      const portalId = portal.id;

      const retrieved = store.getPortalFromRoom(testRoomId, portalId);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(portalId);
      expect(retrieved?.name).toBe("Test Portal");
    });

    test("should return null for non-existent portal", () => {
      const portal = store.getPortalFromRoom(testRoomId, "non-existent");
      expect(portal).toBeNull();
    });
  });

  describe("listPortalsInRoom", () => {
    test("should list all portals in a room", () => {
      const portal1 = store.addPortalToRoom(testRoomId, {
        name: "Portal 1",
        target: { type: "local", path: "/path1" },
      });

      const portal2 = store.addPortalToRoom(testRoomId, {
        name: "Portal 2",
        target: { type: "git", gitUrl: "https://github.com/user/repo" },
      });

      const portals = store.listPortalsInRoom(testRoomId);
      expect(portals.length).toBe(2);
      expect(portals.find((p) => p.id === portal1?.id)).toBeTruthy();
      expect(portals.find((p) => p.id === portal2?.id)).toBeTruthy();
    });

    test("should return empty array for room without portals", () => {
      const portals = store.listPortalsInRoom(testRoomId);
      expect(portals).toEqual([]);
    });

    test("should return empty array for non-existent room", () => {
      const portals = store.listPortalsInRoom("non-existent");
      expect(portals).toEqual([]);
    });
  });

  describe("findRoomsByPortalTarget", () => {
    test("should find rooms with portals to specific local path", () => {
      const targetPath = "/shared/palace";

      // Add portal to test room
      store.addPortalToRoom(testRoomId, {
        name: "Shared Portal",
        target: { type: "local", path: targetPath },
      });

      // Create another room with portal to same target
      const room2Result = store.createRoom({ name: "Room 2" });
      if (!room2Result.palaceRoom) {
        throw new Error("Failed to create room 2");
      }
      const room2Id = room2Result.palaceRoom.id;
      store.addPortalToRoom(room2Id, {
        name: "Another Portal",
        target: { type: "local", path: targetPath },
      });

      // Create room without portal to this target
      store.createRoom({ name: "Room 3" });

      const rooms = store.findRoomsByPortalTarget(targetPath);
      expect(rooms.length).toBe(2);
      expect(rooms.find((r) => r.id === testRoomId)).toBeTruthy();
      expect(rooms.find((r) => r.id === room2Id)).toBeTruthy();
    });

    test("should find rooms with portals to GitHub URL", () => {
      const gitUrl = "https://github.com/user/repo";

      store.addPortalToRoom(testRoomId, {
        name: "GitHub Portal",
        target: { type: "git", gitUrl },
      });

      const rooms = store.findRoomsByPortalTarget(gitUrl);
      expect(rooms.length).toBe(1);
      expect(rooms[0].id).toBe(testRoomId);
    });

    test("should return empty array when no rooms have portals to target", () => {
      const rooms = store.findRoomsByPortalTarget("/nonexistent/target");
      expect(rooms).toEqual([]);
    });
  });

  describe("portal persistence", () => {
    test("should persist portals when room is saved", () => {
      const portalOptions: CreatePortalOptions = {
        name: "Persistent Portal",
        target: {
          type: "git",
          gitUrl: "https://github.com/test/repo",
          branch: "main",
        },
        syncStrategy: "auto",
      };

      const portal = store.addPortalToRoom(testRoomId, portalOptions);
      if (!portal) {
        throw new Error("Failed to add portal");
      }
      const portalId = portal.id;

      // Create new store instance to test persistence
      const newStore = new PalaceRoomStore(fs, alexandriaPath);
      const room = newStore.getRoom(testRoomId);
      const persistedPortal = room?.portals?.find((p) => p.id === portalId);

      expect(persistedPortal).toBeTruthy();
      expect(persistedPortal?.name).toBe("Persistent Portal");
      expect(persistedPortal?.target.gitUrl).toBe(
        "https://github.com/test/repo",
      );
      expect(persistedPortal?.syncStrategy).toBe("auto");
    });
  });
});

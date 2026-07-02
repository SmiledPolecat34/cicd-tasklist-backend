import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		// Clean up database between tests
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});
	});

	describe("GET /api/tasks", () => {
		it("should return an empty list initially", async () => {
			const res = await request(app).get("/api/tasks");
			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});

		it("should return created tasks", async () => {
			await request(app).post("/api/tasks").send({ title: "Task A" });
			const res = await request(app).get("/api/tasks");
			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(1);
			expect(res.body[0].title).toBe("Task A");
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should return 404 for a non-existent task", async () => {
			const res = await request(app).get("/api/tasks/999999");
			expect(res.status).toBe(404);
		});

		it("should return the task when it exists", async () => {
			const created = await request(app).post("/api/tasks").send({ title: "Findable" });
			const res = await request(app).get(`/api/tasks/${created.body.id}`);
			expect(res.status).toBe(200);
			expect(res.body.title).toBe("Findable");
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update a task", async () => {
			const created = await request(app).post("/api/tasks").send({ title: "To update" });
			const res = await request(app).put(`/api/tasks/${created.body.id}`).send({ completed: true });
			expect(res.status).toBe(200);
			expect(res.body.completed).toBe(true);
		});

		it("should return 404 when updating a non-existent task", async () => {
			const res = await request(app).put("/api/tasks/999999").send({ completed: true });
			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete a task", async () => {
			const created = await request(app).post("/api/tasks").send({ title: "To delete" });
			const res = await request(app).delete(`/api/tasks/${created.body.id}`);
			expect(res.status).toBe(204);
		});

		it("should return 404 when deleting a non-existent task", async () => {
			const res = await request(app).delete("/api/tasks/999999");
			expect(res.status).toBe(404);
		});
	});
});

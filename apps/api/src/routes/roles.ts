import { prisma } from "@emplobo/db";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { AuthContext } from "../types.js";

const createRoleSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional(),
  })
  .strict();

type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) {
    throw new Error("requireAdmin must run before roles handlers");
  }
  return req.auth;
}

export function createRolesRouter(requireAdmin: AuthMiddleware): Router {
  const router = Router();

  // All role routes are admin-only (Section 9).
  router.use(requireAdmin);

  // POST /api/roles — create a DRAFT training role for this org
  router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const parsed = createRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "invalid body",
          details: parsed.error.flatten(),
        });
        return;
      }

      const { name, description } = parsed.data;
      const role = await prisma.trainingRole.create({
        data: {
          orgId: auth.orgId,
          name,
          description: description || null,
          status: "DRAFT",
        },
      });

      res.status(201).json({ role });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/roles — list active roles for this org
  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const roles = await prisma.trainingRole.findMany({
        where: { orgId: auth.orgId, isActive: true },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          completenessScore: true,
          trainingMessageCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json({ roles });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/roles/:id — single role, tenant-scoped
  router.get(
    "/:id",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            isActive: true,
            completenessScore: true,
            trainingMessageCount: true,
            activeTrainerId: true,
            activeTrainerAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        res.json({ role });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

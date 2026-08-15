import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { createWorkspaceDocument, listWorkspaceDocuments, removeWorkspaceDocument } from "./db";
import { decodeDocumentBase64, safeDocumentName } from "./documentHelpers";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";

const documentUploadInput = z.object({
  name: z.string().trim().min(1).max(255),
  category: z.string().trim().min(1).max(64),
  description: z.string().trim().max(1000).optional(),
  linkedModule: z.string().trim().max(64).optional(),
  linkedReference: z.string().trim().max(128).optional(),
  mimeType: z.string().trim().min(1).max(128),
  fileBase64: z.string().min(1),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  documents: router({
    list: publicProcedure.query(() => listWorkspaceDocuments()),
    upload: publicProcedure.input(documentUploadInput).mutation(async ({ input }) => {
      const bytes = decodeDocumentBase64(input.fileBase64);
      const { key, url } = await storagePut(`workspace-documents/${safeDocumentName(input.name)}`, bytes, input.mimeType);
      const created = await createWorkspaceDocument({
        name: input.name,
        category: input.category,
        description: input.description || null,
        fileKey: key,
        url,
        mimeType: input.mimeType,
        sizeBytes: bytes.byteLength,
        linkedModule: input.linkedModule || null,
        linkedReference: input.linkedReference || null,
      });
      return created;
    }),
    remove: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await removeWorkspaceDocument(input.id);
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/notes", async (req, res) => {
  try {
    const notes = await db
      .select()
      .from(notesTable)
      .orderBy(notesTable.updatedAt);
    res.json(notes.reverse().map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err, "Failed to fetch notes");
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

router.post("/notes", async (req, res) => {
  try {
    const { title, content } = req.body as { title?: string; content?: string };
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const [note] = await db
      .insert(notesTable)
      .values({ title, content: content ?? "" })
      .returning();
    res.status(201).json({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to create note");
    res.status(500).json({ error: "Failed to create note" });
  }
});

router.get("/notes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [note] = await db.select().from(notesTable).where(eq(notesTable.id, id));
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    res.json({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch note");
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

router.put("/notes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, content } = req.body as { title?: string; content?: string };
    const updates: Partial<{ title: string; content: string; updatedAt: Date }> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    updates.updatedAt = new Date();

    const [note] = await db
      .update(notesTable)
      .set(updates)
      .where(eq(notesTable.id, id))
      .returning();
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    res.json({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to update note");
    res.status(500).json({ error: "Failed to update note" });
  }
});

router.delete("/notes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await db
      .delete(notesTable)
      .where(eq(notesTable.id, id))
      .returning();
    if (result.length === 0) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete note");
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;

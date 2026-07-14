// server/src/pharmacy/category.controller.js
import prisma from "../lib/prisma.js";

// GET /api/pharmacy/categories
export async function listCategories(req, res) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { medicines: true } } },
    });
    return res.status(200).json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        medicineCount: c._count.medicines,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("List categories error:", err);
    return res.status(500).json({ message: "Could not fetch categories." });
  }
}

// POST /api/pharmacy/categories  { name }
export async function createCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required." });
    }

    const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({ message: "A category with this name already exists." });
    }

    const category = await prisma.category.create({ data: { name: name.trim() } });
    return res.status(201).json({ category: { ...category, medicineCount: 0 } });
  } catch (err) {
    console.error("Create category error:", err);
    return res.status(500).json({ message: "Could not create category." });
  }
}

// PUT /api/pharmacy/categories/:id  { name }
export async function updateCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required." });
    }

    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Category not found." });

    const nameTaken = await prisma.category.findFirst({
      where: { name: name.trim(), id: { not: req.params.id } },
    });
    if (nameTaken) {
      return res.status(409).json({ message: "Another category already uses this name." });
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
    });
    return res.status(200).json({ category });
  } catch (err) {
    console.error("Update category error:", err);
    return res.status(500).json({ message: "Could not update category." });
  }
}

// DELETE /api/pharmacy/categories/:id
export async function deleteCategory(req, res) {
  try {
    const existing = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { medicines: true } } },
    });
    if (!existing) return res.status(404).json({ message: "Category not found." });

    if (existing._count.medicines > 0) {
      return res.status(409).json({
        message: `Can't delete — ${existing._count.medicines} medicine(s) still use this category.`,
      });
    }

    await prisma.category.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: "Category deleted." });
  } catch (err) {
    console.error("Delete category error:", err);
    return res.status(500).json({ message: "Could not delete category." });
  }
}
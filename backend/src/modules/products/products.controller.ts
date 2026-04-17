import type { Request, Response, NextFunction } from 'express';
import { CreateProductSchema, UpdateProductSchema, SortProductsSchema } from './products.schema.js';
import * as ProductService from './products.service.js';

export async function listHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await ProductService.listProducts(req.business.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = CreateProductSchema.parse(req.body);
    const data = await ProductService.createProduct(req.business.id, input);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = UpdateProductSchema.parse(req.body);
    const data = await ProductService.updateProduct(req.business.id, req.params['id'] as string, input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await ProductService.deleteProduct(req.business.id, req.params['id'] as string);
    res.json({ data: { message: 'Product deactivated' } });
  } catch (err) {
    next(err);
  }
}

export async function sortHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = SortProductsSchema.parse(req.body);
    await ProductService.sortProducts(req.business.id, input);
    res.json({ data: { message: 'Sort order updated' } });
  } catch (err) {
    next(err);
  }
}

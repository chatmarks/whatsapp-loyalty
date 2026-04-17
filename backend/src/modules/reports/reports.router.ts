import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { summaryHandler, customersHandler, productsHandler } from './reports.controller.js';

export const reportsRouter = Router();

reportsRouter.use(authMiddleware);

reportsRouter.get('/summary', summaryHandler);
reportsRouter.get('/customers', customersHandler);
reportsRouter.get('/products', productsHandler);

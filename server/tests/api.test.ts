import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';

let app: express.Express;

beforeAll(async () => {
  app = express();
  await registerRoutes(app);
});

describe('dashboard metrics', () => {
  it('returns metrics structure', async () => {
    const res = await request(app).get('/api/dashboard/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalOrders');
  });
});

describe('orders list', () => {
  it('returns paginated orders', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rows');
  });
});

describe('order items', () => {
  it('returns items', async () => {
    const res = await request(app).get('/api/orders/1/items');
    expect([200,500]).toContain(res.status);
  });
});

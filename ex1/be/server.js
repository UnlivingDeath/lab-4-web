const cors = require('cors');
const express = require('express');

const app = express();
const PORT = 5001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

let products = [
  { id: 1, name: 'Laptop Dell XPS 15', price: 35000000, category: 'Electronics' },
  { id: 2, name: 'Logitech MX Master 3S Mouse', price: 2400000, category: 'Accessories' }
];
let nextId = 3;

function isValidPrice(price) {
  if ((typeof price !== 'number' && typeof price !== 'string') ||
      (typeof price === 'string' && !price.trim())) {
    return false;
  }
  return Number.isFinite(Number(price)) && Number(price) > 0;
}

app.get('/api/v1/products', (req, res) => {
  const { category } = req.query;
  const filteredProducts = category
    ? products.filter((product) => product.category === category)
    : products;

  res.json({ success: true, count: filteredProducts.length, data: filteredProducts });
});

app.post('/api/v1/products', (req, res) => {
  const { name, price, category } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || !isValidPrice(price)) {
    return res.status(400).json({
      success: false,
      message: 'A product name and a valid positive price are required.'
    });
  }

  const product = {
    id: nextId++,
    name: name.trim(),
    price: Number(price),
    category: typeof category === 'string' && category.trim() ? category.trim() : 'General'
  };
  products.push(product);
  res.status(201).json({
    success: true,
    message: 'Product added successfully',
    data: product
  });
});

app.put('/api/v1/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = products.find((item) => item.id === id);
  if (!Number.isInteger(id) || !product) {
    return res.status(404).json({ success: false, message: `Product ID ${req.params.id} not found` });
  }

  const { name, price, category } = req.body || {};
  if (
    (name !== undefined && (typeof name !== 'string' || !name.trim())) ||
    (price !== undefined && !isValidPrice(price)) ||
    (category !== undefined && typeof category !== 'string')
  ) {
    return res.status(400).json({ success: false, message: 'Invalid product data.' });
  }
  if (name === undefined && price === undefined && category === undefined) {
    return res.status(400).json({ success: false, message: 'At least one product field is required.' });
  }

  if (name !== undefined) product.name = name.trim();
  if (price !== undefined) product.price = Number(price);
  if (category !== undefined) product.category = category.trim() || 'General';

  res.json({ success: true, data: product });
});

app.delete('/api/v1/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = products.findIndex((product) => product.id === id);
  if (!Number.isInteger(id) || index === -1) {
    return res.status(404).json({ success: false, message: `Product ID ${req.params.id} not found` });
  }

  products.splice(index, 1);
  res.json({ success: true, message: `Deleted product ID ${id}` });
});

app.listen(PORT, () => {
  console.log(`Backend API running at: http://localhost:${PORT}`);
});

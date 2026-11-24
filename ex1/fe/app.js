const API_URL = 'http://localhost:5001/api/v1/products';
const productForm = document.getElementById('productForm');
const categoryFilter = document.getElementById('categoryFilter');
const errorMessage = document.getElementById('errorMessage');
const tableBody = document.querySelector('#productTable tbody');

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function clearError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

async function request(url, options) {
    let response;
    try {
        response = await fetch(url, options);
    } catch (error) {
        throw new Error('Cannot reach the product API. Check that the backend is running.');
    }

    const result = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(result?.message || `Request failed (${response.status}).`);
    }
    return result;
}

function addCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
}

function renderProducts(products) {
    tableBody.replaceChildren();
    products.forEach((product) => {
        const row = document.createElement('tr');
        addCell(row, product.id);
        addCell(row, product.name);
        addCell(row, `${new Intl.NumberFormat('en-US').format(product.price)} VND`);
        addCell(row, product.category);

        const actions = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'btn-edit';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => renderEditRow(row, product));

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn-delete';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteProduct(product.id));

        actions.append(editButton, deleteButton);
        row.appendChild(actions);
        tableBody.appendChild(row);
    });
}

function renderEditRow(row, product) {
    row.replaceChildren();
    addCell(row, product.id);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = product.name;
    nameInput.setAttribute('aria-label', 'Product name');
    row.appendChild(document.createElement('td')).appendChild(nameInput);

    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.min = '0.01';
    priceInput.step = 'any';
    priceInput.value = product.price;
    priceInput.setAttribute('aria-label', 'Product price');
    row.appendChild(document.createElement('td')).appendChild(priceInput);

    const categoryInput = document.createElement('input');
    categoryInput.type = 'text';
    categoryInput.value = product.category;
    categoryInput.setAttribute('aria-label', 'Product category');
    row.appendChild(document.createElement('td')).appendChild(categoryInput);

    const actions = document.createElement('td');
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'btn-save';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', async () => {
        try {
            await request(`${API_URL}/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.value,
                    price: priceInput.value,
                    category: categoryInput.value
                })
            });
            clearError();
            await loadProducts();
            await loadCategories();
        } catch (error) {
            showError(error.message);
        }
    });

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn-cancel';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', loadProducts);
    actions.append(saveButton, cancelButton);
    row.appendChild(actions);
}

async function loadProducts() {
    const category = categoryFilter.value;
    const url = category ? `${API_URL}?category=${encodeURIComponent(category)}` : API_URL;
    try {
        const result = await request(url);
        renderProducts(result.data);
        clearError();
    } catch (error) {
        showError(error.message);
    }
}

async function loadCategories() {
    try {
        const result = await request(API_URL);
        const selectedCategory = categoryFilter.value;
        const categories = [...new Set(result.data.map((product) => product.category))]
            .sort((a, b) => a.localeCompare(b));
        categoryFilter.replaceChildren(new Option('All categories', ''));
        categories.forEach((category) => categoryFilter.add(new Option(category, category)));
        categoryFilter.value = categories.includes(selectedCategory) ? selectedCategory : '';
    } catch (error) {
        showError(error.message);
    }
}

productForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const productData = {
        name: document.getElementById('name').value,
        price: document.getElementById('price').value,
        category: document.getElementById('category').value
    };

    try {
        await request(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        productForm.reset();
        clearError();
        await loadCategories();
        await loadProducts();
    } catch (error) {
        showError(error.message);
    }
});

categoryFilter.addEventListener('change', loadProducts);

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
        await request(`${API_URL}/${id}`, { method: 'DELETE' });
        clearError();
        await loadCategories();
        await loadProducts();
    } catch (error) {
        showError(error.message);
    }
}

loadCategories().then(loadProducts);

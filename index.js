const express = require('express');
const fetch = require('node-fetch').default;
const { readFileSync, writeFileSync } = require('fs');
const { traducir } = require('./helpers/traduccion.js');
const { primeraLetra } = require('./helpers/primerLetra.js');

const app = express();
const PORT = process.env.PORT || 3000;

var descuentosRaw = readFileSync('./data/descuentos.json');
var descuentos = JSON.parse(descuentosRaw);

app.use(express.json());

function generarID() {
    return Math.random().toString(36).substr(2, 9);
}

app.post('/comprar', (req, res) => {
    const nuevosProductos = req.body;
    try {
        const productosExistentesRaw = readFileSync('./data/compras.json');
        const productosExistentes = JSON.parse(productosExistentesRaw);
        const productosActualizados = [...productosExistentes, { idCompra: generarID(), ...nuevosProductos }];
        writeFileSync('./data/compras.json', JSON.stringify(productosActualizados));
        res.json({ message: 'La compra se ha realizado exitosamente.' });
    } catch (error) {
        console.error('Error al guardar productos: ', error);
        res.status(500).json({ error: 'Error al guardar productos.' });
    }
});

app.get('/productos/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const response = await fetch(`https://fakestoreapi.com/products/${id}`);
        const producto = await response.json();
        let titulo = await traducir(producto.title);
        let descripcion = await traducir(producto.description);
        let categoria = await traducir(producto.category);
        titulo = primeraLetra(titulo);
        descripcion = primeraLetra(descripcion);
        categoria = primeraLetra(categoria);
        producto.title = titulo;
        producto.description = descripcion;
        producto.category = categoria;
        const descuento = descuentos.find(descuento => descuento.id === producto.id);
        if (descuento) {
            producto.descuento = descuento.descuento;
            let descuentoValor = producto.price * (producto.descuento / 100);
            let descuentoValorDecimal = parseFloat(descuentoValor).toFixed(2);
            producto.descuentoEnDinero = Number(descuentoValorDecimal);
            let precioFinal = producto.price - producto.descuentoEnDinero;
            let precioFinalDecimal = parseFloat(precioFinal).toFixed(2);
            producto.precioConDescuentoAplicado = Number(precioFinalDecimal);
            producto.tieneDescuento = true;
        } else {
            producto.precioConDescuentoAplicado = producto.price;
            producto.tieneDescuento = false;
        }
        res.json(producto);
    } catch (error) {
        console.error(`Error al obtener producto con ID ${id}: `, error);
        res.status(500).json({ error: `Error al obtener producto con ID ${id}` });
    }
})

app.get('/productos', async (req, res) => {
    const { category } = req.query;
    let url = 'https://fakestoreapi.com/products';
    try {
        if (category) {
            url += `/category${category}`;
        }
        const response = await fetch(url);
        let productos = await response.json();
        productos = await Promise.all(productos.map(async (producto) => {
            let titulo = await traducir(producto.title);
            let descripcion = await traducir(producto.description);
            let categoria = await traducir(producto.category);
            titulo = primeraLetra(titulo);
            descripcion = primeraLetra(descripcion);
            categoria = primeraLetra(categoria);
            producto.title = titulo;
            producto.description = descripcion;
            producto.category = categoria;
            const descuento = descuentos.find(descuento => descuento.id === producto.id);
            if (descuento) {
                producto.descuento = descuento.descuento;
                let descuentoValor = producto.price * (producto.descuento / 100);
                let descuentoValorDecimal = parseFloat(descuentoValor).toFixed(2);
                producto.descuentoEnDinero = Number(descuentoValorDecimal);
                let precioFinal = producto.price - producto.descuentoEnDinero;
                let precioFinalDecimal = parseFloat(precioFinal).toFixed(2);
                producto.precioConDescuentoAplicado = Number(precioFinalDecimal);
                producto.tieneDescuento = true;
            } else {
                producto.tieneDescuento = false
            }
            return producto;
        }));
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos: ', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
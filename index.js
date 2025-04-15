const pg = require("pg");
const express = require("express");
const morgan = require("morgan");

const client = new pg.Client(
    process.env.DATABASE_URL || "postgres://postgres@localhost/icecream_shop_db"
);

const server = express();

const port = process.env.PORT || 3001;
server.listen(port, () => console.log(`listening on port ${port}`));

const init = async () => {
    await client.connect();
    console.log("connected to database");

    let SQL = `
    DROP TABLE IF EXISTS flavors;

    CREATE TABLE flavors(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
    );
    `;

    await client.query(SQL);
    console.log("tables created");

    SQL = ` 
  INSERT INTO flavors(name) VALUES ('Ultra Chocolate');
  INSERT INTO flavors(name) VALUES ('Cookies & Cream');
  INSERT INTO flavors(name) VALUES ('Black Cherry');
    `;

    await client.query(SQL);
    console.log("data seeded");
};

init();

// Middleware
server.use(express.json());
server.use(morgan("dev"));

// Routes
server.get('/api/flavors', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM flavors';
        const response = await client.query(SQL);
        res.status(200).json(response.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve flavors' });
    }
});
server.get('/api/flavors/:id', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM flavors WHERE id = $1';
        const response = await client.query(SQL, [req.params.id]);
        res.send(response.rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/flavors: Create a new flavor
server.post('/api/flavors', async (req, res, next) => {
    try {
        const flavor = req.body;
        const SQL = 'INSERT INTO flavors(name) VALUES($1) RETURNING *';
        const response = await client.query(SQL, [flavor.name]);
        res.status(201).json(response.rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/flavors/:id: Delete a flavor by ID
server.delete('/api/flavors/:id', async (req, res, next) => {
    try {
        const flavorId = req.params.id;
        const SQL = 'DELETE FROM flavors WHERE id = $1 RETURNING *';
        const response = await client.query(SQL, [flavorId]);
        if (response.rows.length === 0) {
            res.status(404).send('flavor not found');
        } else {
            res.status(204).send();
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete flavor' });
    }
});

// PUT /api/flavors/:id: Update a flavor by ID
server.put('/api/flavors/:id', async (req, res, next) => {
    try {
        const flavorId = req.params.id;
        const updatedFlavor = req.body;
        const SQL = 'UPDATE flavors SET name = $1, is_favorite = $2, updated_at = now() WHERE id = $3 RETURNING *';
        const response = await client.query(SQL, [updatedFlavor.name, updatedFlavor.is_favorite, flavorId]);
        if (response.rows.length === 0) {
            res.status(404).send('Flavor not found');
        } else {
            res.status(200).json(response.rows[0]);
        }
    } catch (error) {
        next(error);
    }
});
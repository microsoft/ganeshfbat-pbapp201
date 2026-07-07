# Phone Book API

Simple Node.js REST API for managing phone book contacts with basic CRUD and search support.

## Requirements

- Node.js 18+

## Run the app

```bash
npm install
npm start
```

The server starts on `http://localhost:3000` by default. Set `PORT` to change it.

## Run tests

```bash
npm test
```

## API

### List contacts

```http
GET /contacts
GET /contacts?q=alice
```

### Get one contact

```http
GET /contacts/:id
```

### Create a contact

```http
POST /contacts
Content-Type: application/json

{
  "name": "Alice Johnson",
  "phone": "555-0100",
  "email": "alice@example.com"
}
```

### Update a contact

```http
PUT /contacts/:id
Content-Type: application/json

{
  "phone": "555-0199"
}
```

### Delete a contact

```http
DELETE /contacts/:id
```

const http = require('http');
const { randomUUID } = require('crypto');

function createContactStore() {
  const contacts = new Map();

  return {
    list(query) {
      const items = Array.from(contacts.values());

      if (!query) {
        return items;
      }

      const normalizedQuery = query.toLowerCase();

      return items.filter((contact) =>
        [contact.name, contact.phone, contact.email || ''].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        ),
      );
    },
    create(data) {
      const contact = {
        id: randomUUID(),
        name: data.name,
        phone: data.phone,
        email: data.email || '',
      };

      contacts.set(contact.id, contact);
      return contact;
    },
    get(id) {
      return contacts.get(id);
    },
    update(id, data) {
      const current = contacts.get(id);

      if (!current) {
        return null;
      }

      const updated = {
        ...current,
        ...data,
        email: data.email ?? current.email,
      };

      contacts.set(id, updated);
      return updated;
    },
    delete(id) {
      return contacts.delete(id);
    },
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });

    request.on('error', reject);
  });
}

function validateContactPayload(payload, { partial = false } = {}) {
  const errors = [];

  if (!partial || Object.hasOwn(payload, 'name')) {
    if (typeof payload.name !== 'string' || payload.name.trim() === '') {
      errors.push('name is required.');
    }
  }

  if (!partial || Object.hasOwn(payload, 'phone')) {
    if (typeof payload.phone !== 'string' || payload.phone.trim() === '') {
      errors.push('phone is required.');
    }
  }

  if (Object.hasOwn(payload, 'email') && typeof payload.email !== 'string') {
    errors.push('email must be a string.');
  }

  return errors;
}

function createRequestHandler(store = createContactStore()) {
  return async function requestHandler(request, response) {
    const url = new URL(request.url, 'http://localhost');
    const pathParts = url.pathname.split('/').filter(Boolean);

    try {
      if (request.method === 'GET' && url.pathname === '/contacts') {
        sendJson(response, 200, { data: store.list(url.searchParams.get('q')) });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/contacts') {
        const payload = await parseJsonBody(request);
        const errors = validateContactPayload(payload);

        if (errors.length > 0) {
          sendJson(response, 400, { errors });
          return;
        }

        const contact = store.create({
          name: payload.name.trim(),
          phone: payload.phone.trim(),
          email: (payload.email || '').trim(),
        });

        sendJson(response, 201, { data: contact });
        return;
      }

      if (pathParts[0] === 'contacts' && pathParts[1] && pathParts.length === 2) {
        const contactId = pathParts[1];

        if (request.method === 'GET') {
          const contact = store.get(contactId);

          if (!contact) {
            sendJson(response, 404, { error: 'Contact not found.' });
            return;
          }

          sendJson(response, 200, { data: contact });
          return;
        }

        if (request.method === 'PUT') {
          const payload = await parseJsonBody(request);
          const errors = validateContactPayload(payload, { partial: true });

          if (errors.length > 0) {
            sendJson(response, 400, { errors });
            return;
          }

          const nextFields = {};

          if (Object.hasOwn(payload, 'name')) {
            nextFields.name = payload.name.trim();
          }

          if (Object.hasOwn(payload, 'phone')) {
            nextFields.phone = payload.phone.trim();
          }

          if (Object.hasOwn(payload, 'email')) {
            nextFields.email = payload.email.trim();
          }

          const updated = store.update(contactId, nextFields);

          if (!updated) {
            sendJson(response, 404, { error: 'Contact not found.' });
            return;
          }

          sendJson(response, 200, { data: updated });
          return;
        }

        if (request.method === 'DELETE') {
          const deleted = store.delete(contactId);

          if (!deleted) {
            sendJson(response, 404, { error: 'Contact not found.' });
            return;
          }

          response.writeHead(204);
          response.end();
          return;
        }
      }

      sendJson(response, 404, { error: 'Route not found.' });
    } catch (error) {
      const statusCode = error.message === 'Invalid JSON body.' ? 400 : 500;
      const payload =
        statusCode === 400
          ? { error: error.message }
          : { error: 'Internal server error.' };

      sendJson(response, statusCode, payload);
    }
  };
}

function createServer(store) {
  return http.createServer(createRequestHandler(store));
}

module.exports = {
  createContactStore,
  createRequestHandler,
  createServer,
};

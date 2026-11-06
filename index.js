const express = require('express');
const { randomUUID } = require('node:crypto');

function createApp() {
  const app = express();
  const tasks = new Map();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/tasks', (request, response) => {
    response.json([...tasks.values()]);
  });

  function validateTask(request, response, next) {
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response.status(400).json({ error: 'Un objet JSON est requis.' });
    }
    if (Object.keys(body).some((field) => !['title', 'completed'].includes(field))) {
      return response.status(400).json({ error: 'Champs autorises : title, completed.' });
    }
    if ((request.method === 'POST' || Object.hasOwn(body, 'title')) &&
        (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 200)) {
      return response.status(400).json({ error: 'title doit contenir entre 1 et 200 caracteres.' });
    }
    if (Object.hasOwn(body, 'completed') && typeof body.completed !== 'boolean') {
      return response.status(400).json({ error: 'completed doit etre un booleen.' });
    }
    if (request.method === 'PATCH' && Object.keys(body).length === 0) {
      return response.status(400).json({ error: 'Au moins un champ est requis.' });
    }
    next();
  }

  app.post('/api/tasks', validateTask, (request, response) => {
    const task = {
      id: randomUUID(),
      title: request.body.title.trim(),
      completed: request.body.completed ?? false,
    };
    tasks.set(task.id, task);
    response.location(`/api/tasks/${task.id}`).status(201).json(task);
  });

  app.use('/api/tasks/:id', (request, response, next) => {
    const task = tasks.get(request.params.id);
    if (!task) return response.status(404).json({ error: 'Tache introuvable.' });
    response.locals.task = task;
    next();
  });

  app.get('/api/tasks/:id', (request, response) => {
    response.json(response.locals.task);
  });

  app.patch('/api/tasks/:id', validateTask, (request, response) => {
    const task = response.locals.task;
    if (Object.hasOwn(request.body, 'title')) task.title = request.body.title.trim();
    if (Object.hasOwn(request.body, 'completed')) task.completed = request.body.completed;
    response.json(task);
  });

  app.delete('/api/tasks/:id', (request, response) => {
    tasks.delete(request.params.id);
    response.status(204).end();
  });

  app.use((request, response) => {
    response.status(404).json({ error: 'Route introuvable.' });
  });

  app.use((error, request, response, next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    const message = status === 413 ? 'Corps de requete trop volumineux.'
      : status < 500 ? 'Requete JSON invalide.' : 'Erreur interne du serveur.';
    if (status === 500) console.error(error);
    response.status(status).json({ error: message });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT doit etre un entier entre 1 et 65535.');
  }
  createApp().listen(port, () => console.log(`API disponible sur http://localhost:${port}`));
}

module.exports = { createApp };
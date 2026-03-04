'use strict';

const os = require('os');

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: вместо редиректа на /login возвращаем JSON 401
// ─────────────────────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (!req.uid) {
    return res.status(401).json({
      status: { code: 'not-authorised', message: 'Bearer token required' },
      response: {},
    });
  }
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Инициализация плагина — регистрируем все роуты
// ─────────────────────────────────────────────────────────────────────────────
const init = async ({ router, middleware }) => {
  const uploadsController = require.main.require('./src/controllers/uploads');
  const multer = require.main.require('./node_modules/multer');

  // Multer: временная папка системы (та же, что использует NodeBB по умолчанию)
  const upload = multer({ dest: os.tmpdir() });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/v3/plugins/api-routes/upload
  // Загрузка изображений через Bearer токен без CSRF
  // Работает совместно с nodebb-plugin-upload-api:
  //   filter:uploadStored автоматически конвертирует в WebP и раскладывает по папкам
  // ───────────────────────────────────────────────────────────────────────────
  router.post(
    '/api/v3/plugins/api-routes/upload',
    [
      middleware.authenticateRequest, // Bearer токен → req.uid
      requireAuth,                    // 401 JSON если uid=0
      upload.array('files[]', 20),    // multer: парсим multipart/form-data
      middleware.validateFiles,       // проверка типов и размеров файлов
      middleware.uploads.ratelimit,   // rate limit NodeBB
      // applyCSRF намеренно отсутствует
    ],
    async (req, res) => {
      try {
        await uploadsController.uploadPost(req, res);
      } catch (err) {
        res.status(500).json({
          status: { code: 'internal-server-error', message: err.message },
          response: {},
        });
      }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Место для новых роутов
  // Пример:
  //
  // router.post(
  //   '/api/v3/plugins/api-routes/posts',
  //   [middleware.authenticateRequest, requireAuth],
  //   async (req, res) => { ... }
  // );
  // ───────────────────────────────────────────────────────────────────────────
};

module.exports = { init };

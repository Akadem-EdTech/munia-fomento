/** Error de aplicación con código HTTP. Mensajes en español, de cara al usuario. */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'error',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (m: string, code = 'bad_request') => new AppError(400, m, code);
export const unauthorized = (m = 'No autenticado', code = 'unauthorized') => new AppError(401, m, code);
export const forbidden = (m = 'No tienes acceso a esta acción', code = 'forbidden') => new AppError(403, m, code);
export const notFound = (m = 'No encontrado', code = 'not_found') => new AppError(404, m, code);
export const conflict = (m: string, code = 'conflict') => new AppError(409, m, code);

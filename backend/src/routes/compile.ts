import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { compileCode } from '../compiler';

export const compileRoute = Router();

compileRoute.post('/compile', async (req: Request, res: Response) => {
  const { code, options } = req.body as {
    code: string;
    options?: {
      standard?: string;
      optimization?: string;
      warnings?: boolean;
    };
  };

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'No code provided.' });
  }

  const {
    standard = 'c++17',
    optimization = 'O0',
    warnings = true,
  } = options ?? {};

  const sessionId = uuidv4();

  const result = await compileCode(sessionId, code, standard, optimization, warnings);

  if (result.success) {
    return res.json({
      success: true,
      sessionId,
      compilationOutput: result.output,
    });
  } else {
    return res.json({
      success: false,
      error: result.output,
    });
  }
});

compileRoute.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

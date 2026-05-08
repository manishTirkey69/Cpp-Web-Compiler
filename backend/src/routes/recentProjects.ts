import { Router, Request, Response } from 'express';
import {
  addRecentProject,
  getRecentProjectsPath,
  readRecentProjects,
} from '../recentProjects';

export const recentProjectsRoute = Router();

recentProjectsRoute.get('/recent-projects', (_req: Request, res: Response) => {
  res.json({
    success: true,
    path: getRecentProjectsPath(),
    projects: readRecentProjects(),
  });
});

recentProjectsRoute.post('/recent-projects', (req: Request, res: Response) => {
  const pathValue = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
  const projectName = typeof req.body?.projectName === 'string' ? req.body.projectName.trim() : '';
  const openedAt = typeof req.body?.openedAt === 'string' ? req.body.openedAt.trim() : '';

  if (!pathValue || !projectName || !openedAt) {
    res.status(400).json({
      success: false,
      error: 'path, projectName, and openedAt are required.',
    });
    return;
  }

  res.json({
    success: true,
    path: getRecentProjectsPath(),
    projects: addRecentProject({
      path: pathValue,
      projectName,
      openedAt,
    }),
  });
});

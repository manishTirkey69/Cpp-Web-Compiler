import { Router, Request, Response } from 'express';
import { getRecentProjectsPath, readRecentProjects } from '../recentProjects';

export const recentProjectsRoute = Router();

recentProjectsRoute.get('/recent-projects', (_req: Request, res: Response) => {
  res.json({
    success: true,
    path: getRecentProjectsPath(),
    projects: readRecentProjects(),
  });
});

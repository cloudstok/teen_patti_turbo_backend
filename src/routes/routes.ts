import { Router, Response } from "express";

const routes = Router();

routes.get('/', (_, res: Response) => {
    res.send({ status: true, msg: 'Teen Patti Turbo game tested successfully' });
});

export { routes };
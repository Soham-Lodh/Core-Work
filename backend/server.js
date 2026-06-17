import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express'
import {serve} from 'inngest/express';
import {inngest,functions} from './inngest/index.js';
import workspaceRouter from './routes/workspaceRoutes.js';
import projectRouter from './routes/projectRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentRoutes.js';
import { protect } from './middleware/authMiddleware.js';

const app=express();
app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.get('/',(req,res)=>{
    res.send('Server started');
});

app.use('/api/ingest',serve({client:inngest,functions}));

app.use('/api/workspaces',protect,workspaceRouter);
app.use('/api/projects',protect,projectRouter);
app.use('/api/tasks',protect,taskRouter);
app.use('/api/comments',protect,commentRouter);
const PORT=process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});
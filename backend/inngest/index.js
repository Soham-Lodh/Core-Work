import { Inngest } from "inngest";
import prisma from "../configs/prisma.js"; // adjust path if needed
import sendEmail from "../configs/nodemailer.js";
export const inngest = new Inngest({
  id: "core-work",
});

const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-created",
    triggers: [
      {
        event: "clerk/user.created",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.create({
      data: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url,
      },
    });
  },
);

const syncUserUpdation = inngest.createFunction(
  {
    id: "sync-user-updated",
    triggers: [
      {
        event: "clerk/user.updated",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url,
      },
    });
  },
);

const syncUserDeletion = inngest.createFunction(
  {
    id: "sync-user-deleted",
    triggers: [
      {
        event: "clerk/user.deleted",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.delete({
      where: {
        id: data.id,
      },
    });
  },
);

const syncWorkSpaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-created",
    triggers: [
      {
        event: "clerk/organization.created",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });
    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  },
);

const syncWorkSpaceUpdation = inngest.createFunction(
  {
    id: "sync-workspace-updated",
    triggers: [
      {
        event: "clerk/organization.updated",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url,
      },
    });
  },
);

const syncWorkSpaceDeletion = inngest.createFunction(
  {
    id: "sync-workspace-deleted",
    triggers: [
      {
        event: "clerk/organization.deleted",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.delete({
      where: {
        id: data.id,
      },
    });
  },
);

const syncWorkSpaceMemberCreation = inngest.createFunction(
  {
    id: "sync-workspace-member-created",
    triggers: [
      {
        event: "clerk/organizationInvitation.accepted",
      },
    ],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspaceMember.create({
      data: {
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role_name).toUpperCase(),
      },
    });
  },
);
const sendTaskAssignmentEmail = inngest.createFunction(
  {
    id: "send-task-assignment-email",
    triggers: [
      {
        event: "app/task.assigned",
      },
    ],
  },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        assignee: true,
        project: true,
      },
    });
    await sendEmail({
      to: task.assignee.email,
      subject: `New Task Assigned in ${task.project.name}`,
      body: `
        <p>Hello ${task.assignee.name},</p>
        <p>You have been assigned a new task:</p>
        <h2>${task.title}</h2>
        <p>Description: ${task.description}</p>
        <p>Due Date: ${new Date(task.due_date).toLocaleDateString()}</p>
        <a href=${origin}>View Task</a>
        <p>Project: ${task.project.name}</p>
      `,
    });
    if(new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()){
      await step.sleepUntil('wait-for-the-due-date', new Date(task.due_date));
      await step.run('check-task-completion', async () => {
        const task = await prisma.task.findUnique({
          where: {
            id: taskId,
          },
          include: {
            assignee: true,
            project: true,
          },
        });
        if(!task)return;
        if(task.status !== 'DONE'){
          await step.run('send-task-reminder-email', async () => {
            await sendEmail({
              to: task.assignee.email,
              subject: `Task Reminder: ${task.title}`,
              body: `
              <p>Hello ${task.assignee.name},</p>
              <p>This is a reminder that the task "${task.title}" assigned to you in the project "${task.project.name}" is due today.</p>
              <p>Please make sure to complete it on time.</p>
              <p>Due Date: ${new Date(task.due_date).toLocaleDateString()}</p>
              <a href=${origin}>View Task</a>
              `,
            });
          });
        }
      });
    }
  }
);


export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
  syncWorkSpaceCreation,
  syncWorkSpaceUpdation,
  syncWorkSpaceDeletion,
  syncWorkSpaceMemberCreation,
  sendTaskAssignmentEmail
];

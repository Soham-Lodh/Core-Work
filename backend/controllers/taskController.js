import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";
export const createTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const {
      projectId,
      title,
      description,
      type,
      status,
      priority,
      assigneeId,
      due_date,
    } = req.body;
    const origin = req.get("origin");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { include: { user: true } },
      },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({ message: "You are not the team lead of this project" });
    } else if (
      assigneeId &&
      !project.members.some((member) => member.userId === assigneeId)
    ) {
      return res
        .status(403)
        .json({
          message: "Assignee must be a member of the project or workspace",
        });
    }
    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        priority,
        assigneeId,
        status,
        type,
        due_date: due_date ? new Date(due_date) : null,
      },
    });
    const taskWithAssignee = await prisma.task.findUnique({
      where: { id: task.id },
      include: { assignee: true },
    });

    const assignee = await prisma.user.findUnique({
      where: {
        id: assigneeId,
      },
    });

    if (assignee) {
      await sendEmail({
        to: assignee.email,
        subject: `New Task Assigned in ${project.name}`,
        body: `
            <p>Hello ${assignee.name},</p>

            <p>You have been assigned a new task.</p>

            <h3>${title}</h3>

            <p><strong>Description:</strong> ${description || "No description provided"}</p>

            <p><strong>Priority:</strong> ${priority}</p>

            <p><strong>Status:</strong> ${status}</p>

            ${
              due_date
                ? `<p><strong>Due Date:</strong> ${new Date(
                    due_date,
                  ).toLocaleDateString()}</p>`
                : ""
            }

            <p><strong>Project:</strong> ${project.name}</p>

            <a href="${origin}">
                Open Project
            </a>
        `,
      });
    }

    res
      .status(201)
      .json({ message: "Task created successfully", task: taskWithAssignee });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.code || error.message });
  }
};
export const updateTask = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const { userId } = await req.auth();
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: {
        members: { include: { user: true } },
      },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({ message: "You are not the team lead of this project" });
    }
    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res
      .status(200)
      .json({ message: "Task updated successfully", task: updatedTask });
  } catch (error) {
    res.status(500).json({ error: error.code || error.message });
  }
};
export const deleteTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { taskIds } = req.body;
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
    });
    if (tasks.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    const project = await prisma.project.findUnique({
      where: { id: tasks[0].projectId },
      include: {
        members: { include: { user: true } },
      },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({ message: "You are not the team lead of this project" });
    }
    await prisma.task.deleteMany({
      where: { id: { in: taskIds } },
    });
    res.status(200).json({ message: "Task(s) deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.code || error.message });
  }
};

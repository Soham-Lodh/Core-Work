import prisma from "../configs/prisma.js";

export const getUserWorkspaces = async (req, res) => {
  try {
    const { userId } = await req.auth();

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        projects: {
          include: {
            tasks: {
              include: {
                assignee: true,
                comments: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        owner: true,
      },
    });

    res.json({workspaces});
  } catch (error) {
    console.error("Error fetching user workspaces:", error);
    res.status(500).json({
      message: error.code||error.message
    });
  }
};

export const addMember=async(req,res)=>{
    try{
        const { userId } = await req.auth();
        const {email,role,workspaceId,message} = req.body;
        const user=await prisma.user.findUnique({
            where:{
                email
            }
        });
        if(!user){
            return res.status(404).json({
                message:"User not found"
            });
        }
        if(!workspaceId || !role){
            return res.status(400).json({
                message:"WorkspaceId and role are required"
            });
        }
        if(!['ADMIN','MEMBER'].includes(role.toUpperCase())){
            return res.status(400).json({
                message:"Invalid role. Please specify either 'ADMIN' or 'MEMBER'."
            });
        }
        const workspace=await prisma.workspace.findUnique({
            where:{
                id:workspaceId
            },
            include:{
                members:true
            }
        });
        if(!workspace){
            return res.status(404).json({
                message:"Workspace not found"
            });
        }
        if(!workspace.members.find((member)=>member.userId===userId && member.role==="ADMIN")){
            return res.status(401).json({
                message:"Only workspace admins can add members"
            });
        }
        if(workspace.members.find((member)=>member.userId===user.id)){
            return res.status(400).json({
                message:"User is already a member of the workspace"
            });
        }
        const member=await prisma.workspaceMember.create({
            data:{
                userId:user.id,
                workspaceId,
                role,
                message
            }
        });

        res.status(201).json({ member ,message:"Member added successfully"});
    }
    catch (error) {
    console.error("Error fetching user workspaces:", error);
    res.status(500).json({
      message: error.code||error.message
    });
  }
}
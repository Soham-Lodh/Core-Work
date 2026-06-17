import prisma from "../configs/prisma.js";

export const createProject=async(req,res)=>{
    try{
        const {userId}=await req.auth();
        const {workspaceId,description,name,status,start_date,end_date,team_members,team_lead,progress,priority}=req.body;
        const workspace=await prisma.workspace.findUnique({
            where:{
                id:workspaceId
            },
            include:{
                members:{
                    include:{
                        user:true
                    }
                }
            }
        });
        if(!workspace){
            return res.status(404).json({message:"Workspace not found"});
        }
        if(!workspace.members.some((member)=>member.userId===userId && member.role==="ADMIN")){
            return res.status(403).json({message:"You are not an admin of this workspace"});
        }
        const teamLead=await prisma.user.findUnique({
            where:{email:team_lead},
            select:{id:true}
        })
        const project=await prisma.project.create({
            data:{
                workspaceId,
                name,
                description,
                status,
                priority,
                progress,
                teamLead,
                start_date:start_date?new Date(start_date):null,
                end_date:end_date?new Date(end_date):null
            }
        });
        if(team_members && team_members.length>0){
            const membersToAdd=[]
            workspace.members.forEach((member)=>{
                if(team_members.includes(member.user.email)){
                    membersToAdd.push(member.userId);
                }
            });
            await prisma.projectMember.createMany({
                data:membersToAdd.map((memberId)=>({
                    projectId:project.id,
                    userId:memberId
                }))
            });

        }
        const projectWithMembers=await prisma.project.findUnique({
            where:{id:project.id},
            include:{
                members:{
                    include:{
                        user:true
                    }
                },
                tasks:{
                    include:{
                        asignee:true,
                        comments:{
                            include:{
                                user:true
                            }
                        }
                    }
                },
                owner:true,
            }
        });
        res.status(201).json({message:"Project created successfully",project:projectWithMembers});
    }
    catch(error){
        Console.log(error);
        res.status(500).json({message:error.code||error.message||"Internal Server Error"});
    }
}

export const updateProject=async(req,res)=>{
    try{
        const {userId}=await req.auth();
        const {id,workspaceId,description,name,status,start_date,end_date,team_members,team_lead,progress,priority}=req.body;
        const workspace=await prisma.workspace.findUnique({
            where:{
                id:workspaceId
            },
            include:{
                members:{
                    include:{
                        user:true
                    }
                }
            }
        });
        if(!workspace){
            return res.status(404).json({message:"Workspace not found"});
        }
        if(!workspace.members.some((member)=>member.userId===userId && member.role==="ADMIN")){
            const project=await prisma.project.findUnique({
                where:{id},

            })
            if(!project){
                return res.status(404).json({message:"Project not found"});
            }
            else if(project.team_lead!==userId){
                return res.status(403).json({message:"You are not the team lead of this project to update it"});
            }
        }
        const project=await prisma.project.update({
            where:{id},
            data:{
                workspaceId,
                name,
                description,
                status,
                priority,
                progress,
                start_date:start_date?new Date(start_date):null,
                end_date:end_date?new Date(end_date):null
            }
        })
        res.status(200).json({message:"Project updated successfully"},project);
    }
    catch(error){
        Console.log(error);
        res.status(500).json({message:error.code||error.message||"Internal Server Error"});
    }
}

export const addMember=async(req,res)=>{
    try{
        const {userId}=await req.auth();
        const {projectId}=req.params;
        const {email}=req.body;
        const project=await prisma.project.findUnique({
            where:{id:projectId},
            include:{
                members:{
                    include:{
                        user:true
                    }
                }
            }
        });
        if(!project){
            return res.status(404).json({message:"Project not found"});
        }
        if(project.team_lead!==userId){
            return res.status(403).json({message:"You are not the team lead of this project to add members"});
        }
        const existingMember=project.members.find((member)=>member.email===email);
        if(existingMember){
            return res.status(400).json({message:"User is already a member of this project"});
        }
        const user=await prisma.user.findUnique({
            where:{email}
        });
        if(!user){
            return res.status(404).json({message:"User not found"});
        }
        const member=await prisma.projectMember.create({
            data:{
                projectId,
                userId:user.id
            }
        });
        res.status(201).json({message:"Member added successfully",member});
    }
    catch(error){
        Console.log(error);
        res.status(500).json({message:error.code||error.message||"Internal Server Error"});
    }
}